import type { AgentId } from "@/lib/agents/ids";
import { AGENT_IDS } from "@/lib/agents/ids";
import type { Llm } from "@/orchestrator/llm";
import type { UserContext } from "@/lib/survey/survey.v1";
import { buildInitialSystemPrompt } from "@/orchestrator/buildPrompt";
import { activeAgents } from "@/orchestrator/intentCalibrator";
import { getAgent } from "@/agents/registry";
import {
  DEFAULT_RULE_SUITE,
  checkAll,
  hasErrors,
  type RuleCheck,
  type RuleViolation,
} from "./rules";

/**
 * Pipeline de evaluación cualitativa de prompts.
 *
 *   fixtures × agentes activos × ruleSuite  →  EvalReport
 *
 * - Agnóstico del proveedor: recibe un `Llm` y cualquier mock lo puede usar.
 * - Determinista en estructura: dada la misma terna, salida estable.
 *
 * Uso en producción: `scripts/eval-fixtures.ts` (Gemini real).
 * Uso en tests: este módulo con un Llm fake (sin red).
 */

export interface EvalCase {
  id: string;
  userContext: UserContext;
  userMessage: string;
  /** Si está acotado a un agente, limita a ese. Si no, corre todos los activos. */
  targetAgent?: AgentId;
  /** Solo informativo. */
  tags?: string[];
}

export interface EvalRunOptions {
  llm: Llm;
  cases: ReadonlyArray<EvalCase>;
  suite?: ReadonlyArray<RuleCheck>;
  /** Máximo número de tareas concurrentes (rate limit del proveedor). */
  concurrency?: number;
  /** Callback opcional para emitir progreso (útil en CLI). */
  onProgress?: (event: ProgressEvent) => void;
}

export type ProgressEvent =
  | { type: "case_start"; caseId: string; agent: AgentId }
  | { type: "case_done"; caseId: string; agent: AgentId; passed: boolean }
  | { type: "case_error"; caseId: string; agent: AgentId; error: string };

export interface EvalCaseResult {
  caseId: string;
  agent: AgentId;
  text: string;
  violations: RuleViolation[];
  errored: boolean;
  errorMessage?: string;
}

export interface EvalReport {
  startedAt: string;
  finishedAt: string;
  totals: {
    runs: number;
    passed: number;
    failedHard: number;
    warnings: number;
    errored: number;
  };
  byAgent: Record<AgentId, AgentStats>;
  byRule: Record<string, number>;
  results: EvalCaseResult[];
}

export interface AgentStats {
  runs: number;
  passed: number;
  errorViolations: number;
  warningViolations: number;
}

function emptyAgentStats(): AgentStats {
  return { runs: 0, passed: 0, errorViolations: 0, warningViolations: 0 };
}

/**
 * Aprovecha `activeAgents(userContext)` para no evaluar a agentes atenuados:
 * tiene poco sentido medir a Marco en una decisión emocional pura, dado que
 * el orquestador lo apaga en producción para ese fixture.
 */
function agentsToRunFor(c: EvalCase): AgentId[] {
  if (c.targetAgent) return [c.targetAgent];
  return [...activeAgents(c.userContext)];
}

async function evalOne(
  llm: Llm,
  c: EvalCase,
  agent: AgentId,
  suite: ReadonlyArray<RuleCheck>,
): Promise<EvalCaseResult> {
  const spec = getAgent(agent);
  const systemPrompt = buildInitialSystemPrompt({
    agent,
    userContext: c.userContext,
  });
  try {
    const out = await llm.complete({
      systemPrompt,
      messages: [{ role: "user", content: c.userMessage }],
      maxTokens: spec.maxOutputTokens,
      temperature: 0.7,
    });
    const violations = checkAll(
      { agent, phase: "initial", text: out.text },
      suite,
    );
    return {
      caseId: c.id,
      agent,
      text: out.text,
      violations,
      errored: false,
    };
  } catch (err) {
    return {
      caseId: c.id,
      agent,
      text: "",
      violations: [],
      errored: true,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}

async function withConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const queue = items.slice();
  const inFlight: Promise<void>[] = [];
  while (queue.length > 0 || inFlight.length > 0) {
    while (inFlight.length < limit && queue.length > 0) {
      const item = queue.shift()!;
      const p = worker(item).finally(() => {
        const idx = inFlight.indexOf(p);
        if (idx !== -1) inFlight.splice(idx, 1);
      });
      inFlight.push(p);
    }
    await Promise.race(inFlight);
  }
}

export async function runEval(opts: EvalRunOptions): Promise<EvalReport> {
  const suite = opts.suite ?? DEFAULT_RULE_SUITE;
  const concurrency = opts.concurrency ?? 3;
  const tasks: Array<{ c: EvalCase; agent: AgentId }> = [];
  for (const c of opts.cases) {
    for (const agent of agentsToRunFor(c)) tasks.push({ c, agent });
  }

  const results: EvalCaseResult[] = [];
  const startedAt = new Date().toISOString();

  await withConcurrency(tasks, concurrency, async ({ c, agent }) => {
    opts.onProgress?.({ type: "case_start", caseId: c.id, agent });
    const r = await evalOne(opts.llm, c, agent, suite);
    results.push(r);
    if (r.errored) {
      opts.onProgress?.({
        type: "case_error",
        caseId: c.id,
        agent,
        error: r.errorMessage ?? "unknown",
      });
    } else {
      opts.onProgress?.({
        type: "case_done",
        caseId: c.id,
        agent,
        passed: !hasErrors(r.violations),
      });
    }
  });

  const finishedAt = new Date().toISOString();

  const totals = { runs: 0, passed: 0, failedHard: 0, warnings: 0, errored: 0 };
  const byAgent: Record<AgentId, AgentStats> = {
    marco: emptyAgentStats(),
    elena: emptyAgentStats(),
    rafael: emptyAgentStats(),
  };
  const byRule: Record<string, number> = {};

  for (const r of results) {
    totals.runs++;
    byAgent[r.agent].runs++;
    if (r.errored) {
      totals.errored++;
      continue;
    }
    let hardFail = false;
    let warned = false;
    for (const v of r.violations) {
      byRule[v.rule] = (byRule[v.rule] ?? 0) + 1;
      if (v.severity === "error") {
        hardFail = true;
        byAgent[r.agent].errorViolations++;
      } else {
        warned = true;
        byAgent[r.agent].warningViolations++;
      }
    }
    if (hardFail) totals.failedHard++;
    else {
      totals.passed++;
      byAgent[r.agent].passed++;
    }
    if (warned) totals.warnings++;
    // Sólo cuentan los runs que efectivamente corrieron contra el agente.
    // Si los 3 estaban atenuados (imposible por la safety net del calibrator),
    // simplemente no aparecerían en `tasks`.
    void AGENT_IDS;
  }

  return { startedAt, finishedAt, totals, byAgent, byRule, results };
}

/* ── Render legible para la CLI ──────────────────────────────────────────── */

const BAR_WIDTH = 24;

function bar(ratio: number): string {
  const filled = Math.round(ratio * BAR_WIDTH);
  return "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
}

export function formatReport(report: EvalReport): string {
  const lines: string[] = [];
  const { totals } = report;
  const passRate = totals.runs === 0 ? 0 : totals.passed / totals.runs;

  lines.push(
    `COUNCILia · Evaluación de prompts`,
    `─────────────────────────────────────────`,
    `Inicio:    ${report.startedAt}`,
    `Fin:       ${report.finishedAt}`,
    `Runs:      ${totals.runs}`,
    `Pasaron:   ${totals.passed}  ${bar(passRate)}  ${(passRate * 100).toFixed(1)}%`,
    `Errores:   ${totals.failedHard}  (violación dura, severity=error)`,
    `Warnings:  ${totals.warnings}`,
    `Crash:     ${totals.errored}  (excepción en la llamada al LLM)`,
    "",
    "Por agente:",
  );

  for (const a of AGENT_IDS) {
    const s = report.byAgent[a];
    if (s.runs === 0) {
      lines.push(`  ${a.padEnd(7)} —`);
      continue;
    }
    const rate = s.passed / s.runs;
    lines.push(
      `  ${a.padEnd(7)} ${s.passed}/${s.runs}  ${bar(rate)}  ${(rate * 100).toFixed(1)}%   err=${s.errorViolations}  warn=${s.warningViolations}`,
    );
  }

  const ruleEntries = Object.entries(report.byRule).sort((a, b) => b[1] - a[1]);
  if (ruleEntries.length > 0) {
    lines.push("", "Violaciones por regla:");
    for (const [rule, n] of ruleEntries) {
      lines.push(`  ${rule.padEnd(34)} ${String(n).padStart(3)}`);
    }
  }

  return lines.join("\n");
}
