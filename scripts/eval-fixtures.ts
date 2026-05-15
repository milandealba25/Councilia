/**
 * scripts/eval-fixtures.ts
 *
 * Ejecuta los fixtures (`SESSION_FIXTURES`) + anti-prompts (`ANTI_PROMPTS`)
 * contra el LLM real y produce:
 *
 *   - Resumen legible en stdout.
 *   - JSON estructurado en `tests/fixtures/eval-<timestamp>.json` (para diff
 *     entre versiones de prompts y para que el dashboard interno los pinte).
 *
 * Uso:
 *   npm run eval                          # corre todo
 *   npm run eval -- --only-fixtures       # solo SESSION_FIXTURES
 *   npm run eval -- --only-anti           # solo ANTI_PROMPTS
 *   npm run eval -- --concurrency 5
 *
 * Requiere `GEMINI_API_KEY` en `.env.local`.
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv();
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { GeminiLlm } from "../orchestrator/adapters/gemini";
import { runEval, formatReport, type EvalCase } from "../agents/eval";
import { SESSION_FIXTURES } from "../tests/fixtures/cases";
import { ANTI_PROMPTS } from "../agents/antiPrompts";

interface Flags {
  onlyFixtures: boolean;
  onlyAnti: boolean;
  concurrency: number;
  noWrite: boolean;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = {
    onlyFixtures: false,
    onlyAnti: false,
    concurrency: 3,
    noWrite: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--only-fixtures") flags.onlyFixtures = true;
    else if (a === "--only-anti") flags.onlyAnti = true;
    else if (a === "--no-write") flags.noWrite = true;
    else if (a === "--concurrency") {
      const v = Number(argv[++i]);
      if (Number.isFinite(v) && v > 0) flags.concurrency = v;
    }
  }
  return flags;
}

function buildCases(flags: Flags): EvalCase[] {
  const cases: EvalCase[] = [];

  if (!flags.onlyAnti) {
    for (const f of SESSION_FIXTURES) {
      cases.push({
        id: `fx:${f.id}`,
        userContext: f.userContext,
        userMessage: f.userMessage,
        tags: ["fixture"],
      });
    }
  }

  if (!flags.onlyFixtures) {
    for (const a of ANTI_PROMPTS) {
      cases.push({
        id: `anti:${a.id}`,
        userContext: a.userContext,
        userMessage: a.userMessage,
        targetAgent: a.targetAgent,
        tags: ["anti-prompt", a.targetRule],
      });
    }
  }

  return cases;
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));

  if (!process.env.GEMINI_API_KEY) {
    console.error(
      "[eval] Falta GEMINI_API_KEY. Copia .env.example a .env.local y define la clave.",
    );
    process.exit(1);
  }

  const cases = buildCases(flags);
  if (cases.length === 0) {
    console.error("[eval] No hay casos que ejecutar.");
    process.exit(1);
  }

  console.log(
    `[eval] Ejecutando ${cases.length} casos con concurrencia ${flags.concurrency}…`,
  );
  console.log(`[eval] Modelo: ${process.env.GEMINI_MODEL ?? "gemini-2.0-flash"}`);

  const llm = new GeminiLlm();
  let count = 0;
  const total = estimateRuns(cases);
  const report = await runEval({
    llm,
    cases,
    concurrency: flags.concurrency,
    onProgress(ev) {
      if (ev.type === "case_done") {
        count++;
        const flag = ev.passed ? "✓" : "✗";
        process.stdout.write(
          `  ${flag} ${ev.caseId.padEnd(38)} ${ev.agent.padEnd(7)}  (${count}/${total})\n`,
        );
      } else if (ev.type === "case_error") {
        count++;
        process.stdout.write(
          `  ! ${ev.caseId.padEnd(38)} ${ev.agent.padEnd(7)}  ${ev.error}\n`,
        );
      }
    },
  });

  console.log("\n" + formatReport(report) + "\n");

  if (!flags.noWrite) {
    const outDir = path.join(process.cwd(), "tests", "fixtures");
    await mkdir(outDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outPath = path.join(outDir, `eval-${stamp}.json`);
    await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
    console.log(`[eval] Reporte JSON → ${path.relative(process.cwd(), outPath)}`);
  }

  // Exit code: ≠ 0 si hay violaciones duras o crashes.
  const pass = report.totals.failedHard === 0 && report.totals.errored === 0;
  process.exit(pass ? 0 : 1);
}

/**
 * Para `total` en el log de progreso: cuántos runs producirá la suite,
 * descontando agentes atenuados por cada caso.
 */
function estimateRuns(cases: EvalCase[]): number {
  // Se calcula de manera defensiva en `runEval`; aquí ofrecemos una cota baja
  // útil para el log (no afecta la lógica).
  return cases.reduce((acc, c) => acc + (c.targetAgent ? 1 : 3), 0);
}

main().catch((err) => {
  console.error("[eval] Error fatal:", err);
  process.exit(1);
});
