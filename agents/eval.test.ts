import { describe, expect, it } from "vitest";
import { formatReport, runEval, type EvalCase } from "./eval";
import { ANTI_PROMPTS } from "./antiPrompts";
import type { Llm } from "@/orchestrator/llm";

function llmReturning(map: Record<string, string>): Llm {
  return {
    async complete(req) {
      const agent = detectAgent(req.systemPrompt);
      return { text: map[agent] ?? "", model: "fake" };
    },
    async *stream() {
      yield "";
    },
  };
}

function detectAgent(systemPrompt: string): "marco" | "elena" | "rafael" {
  if (systemPrompt.includes("Eres Marco")) return "marco";
  if (systemPrompt.includes("Eres Elena")) return "elena";
  return "rafael";
}

const baseCases: EvalCase[] = [
  {
    id: "case-vida",
    userMessage: "Tengo un dilema cualquiera.",
    userContext: {
      surveyVersion: "v1",
      decisionType: "vida",
      ageRange: "25_34",
      urgency: "este_mes",
      needFromCouncil: "estructurar",
      fearedLoss: "arrepentirme",
    },
  },
];

describe("Eval runner", () => {
  it("marca como failedHard una salida que recomienda explícitamente", async () => {
    const goodLong = Array.from({ length: 180 }, (_, i) => `idea${i}`).join(" ");
    const llm = llmReturning({
      marco: `Yo en tu lugar tomaría la oferta. ${goodLong}`,
      elena: goodLong + ".",
      rafael: `¿Qué supuesto estás dando por verificado? ${goodLong}`,
    });
    const report = await runEval({ llm, cases: baseCases, concurrency: 2 });
    expect(report.totals.runs).toBe(3);
    expect(report.totals.failedHard).toBeGreaterThanOrEqual(1);
    expect(report.byRule.no_recommendation).toBeGreaterThanOrEqual(1);
  });

  it("acepta salidas saludables (sin recomendaciones, longitud OK)", async () => {
    const filler = Array.from({ length: 180 }, (_, i) => `palabra${i}`).join(" ");
    const llm = llmReturning({
      marco: `El horizonte de 24 meses cambia el marco del problema. ${filler}`,
      elena: `El downside material es perder seis meses de runway. ${filler}`,
      rafael: `¿Qué evidencia tienes del supuesto principal? ${filler}`,
    });
    const report = await runEval({ llm, cases: baseCases });
    expect(report.totals.failedHard).toBe(0);
    expect(report.totals.passed).toBe(3);
  });

  it("respeta atenuación: no evalúa al agente atenuado", async () => {
    const filler = Array.from({ length: 180 }, (_, i) => `p${i}`).join(" ");
    const llm = llmReturning({
      marco: filler,
      elena: filler,
      rafael: `¿Qué supuesto? ${filler}`,
    });
    const emotionalCase: EvalCase = {
      id: "emocional",
      userMessage: "...",
      userContext: {
        surveyVersion: "v1",
        decisionType: "relacion",
        ageRange: "25_34",
        urgency: "explorando",
        needFromCouncil: "confrontar",
        fearedLoss: "arrepentirme",
      },
    };
    const report = await runEval({ llm, cases: [emotionalCase] });
    expect(report.byAgent.marco.runs).toBe(0);
    expect(report.byAgent.elena.runs).toBe(1);
    expect(report.byAgent.rafael.runs).toBe(1);
  });

  it("formatea el reporte como string con barras de progreso", async () => {
    const filler = Array.from({ length: 180 }, (_, i) => `q${i}`).join(" ");
    const llm = llmReturning({
      marco: filler,
      elena: filler,
      rafael: `¿Qué supuesto? ${filler}`,
    });
    const report = await runEval({ llm, cases: baseCases });
    const text = formatReport(report);
    expect(text).toContain("Por agente:");
    expect(text).toContain("marco");
  });

  it("anti-prompts: están todos bien definidos y son ejecutables", async () => {
    const filler = Array.from({ length: 180 }, (_, i) => `r${i}`).join(" ");
    const llm = llmReturning({
      marco: filler,
      elena: filler,
      rafael: `¿Qué? ${filler}`,
    });
    const cases: EvalCase[] = ANTI_PROMPTS.map((a) => ({
      id: a.id,
      userMessage: a.userMessage,
      userContext: a.userContext,
      targetAgent: a.targetAgent,
    }));
    const report = await runEval({ llm, cases, concurrency: 5 });
    expect(report.totals.runs).toBeGreaterThan(0);
  });
});
