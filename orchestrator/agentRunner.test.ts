import { describe, expect, it } from "vitest";
import { AgentRunner } from "./agentRunner";
import type { Llm, LlmCompletionRequest } from "./llm";
import type { UserContext } from "@/lib/survey/survey.v1";

function fakeLlm(transcripts: Record<string, string>): Llm {
  return {
    async complete(req: LlmCompletionRequest) {
      const agent = detectAgent(req.systemPrompt);
      return { text: transcripts[agent] ?? "", model: "fake" };
    },
    async *stream(req: LlmCompletionRequest) {
      const agent = detectAgent(req.systemPrompt);
      const text = transcripts[agent] ?? "";
      for (const tok of text.match(/\S+\s*/g) ?? []) {
        yield tok;
      }
    },
  };
}

function detectAgent(systemPrompt: string): "marco" | "elena" | "rafael" {
  if (systemPrompt.includes("Eres Marco")) return "marco";
  if (systemPrompt.includes("Eres Elena")) return "elena";
  return "rafael";
}

const baseCtx: UserContext = {
  surveyVersion: "v1",
  decisionType: "negocio",
  ageRange: "25_34",
  urgency: "este_mes",
  needFromCouncil: "estructurar",
  fearedLoss: "perder_tiempo",
};

describe("AgentRunner (K3)", () => {
  it("ejecuta las 3 posturas en paralelo y emite eventos por agente", async () => {
    const llm = fakeLlm({
      marco: "Postura de Marco.",
      elena: "Postura de Elena.",
      rafael: "Postura de Rafael.",
    });
    const runner = new AgentRunner(llm);

    const collected: Record<string, string> = {};
    const done = new Set<string>();

    for await (const ev of runner.runInitial({
      userContext: baseCtx,
      userMessage: "Tengo un dilema entre A y B.",
    })) {
      if (ev.type === "delta") {
        collected[ev.agent] = (collected[ev.agent] ?? "") + (ev.text ?? "");
      } else if (ev.type === "done") {
        done.add(ev.agent);
      }
    }

    expect(done.has("marco")).toBe(true);
    expect(done.has("elena")).toBe(true);
    expect(done.has("rafael")).toBe(true);
    expect(collected.marco).toContain("Marco");
  });

  it("respeta atenuación: omite a Marco en decisión emocional pura", async () => {
    const llm = fakeLlm({
      marco: "Marco no debería hablar.",
      elena: "Elena sí.",
      rafael: "Rafael sí.",
    });
    const runner = new AgentRunner(llm);

    const activeAgents = new Set<string>();
    for await (const ev of runner.runInitial({
      userContext: { ...baseCtx, decisionType: "relacion", fearedLoss: "arrepentirme" },
      userMessage: "...",
    })) {
      activeAgents.add(ev.agent);
    }

    expect(activeAgents.has("marco")).toBe(false);
    expect(activeAgents.has("elena")).toBe(true);
    expect(activeAgents.has("rafael")).toBe(true);
  });

  it("propaga errores como eventos type=error sin tirar el flujo", async () => {
    const erroring: Llm = {
      async complete() {
        throw new Error("boom");
      },
      async *stream() {
        throw new Error("boom");
      },
    };
    const runner = new AgentRunner(erroring);
    let errors = 0;
    for await (const ev of runner.runInitial({
      userContext: baseCtx,
      userMessage: "...",
    })) {
      if (ev.type === "error") errors++;
    }
    expect(errors).toBe(3);
  });
});
