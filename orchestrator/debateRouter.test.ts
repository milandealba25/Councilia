import { describe, expect, it } from "vitest";
import { DebateRouter, type Posture } from "./debateRouter";
import { AgentRunner } from "./agentRunner";
import type { Llm } from "./llm";

const fakeLlm: Llm = {
  async complete() {
    return { text: "réplica fake", model: "fake" };
  },
  async *stream() {
    for (const tok of ["No ", "estoy ", "de ", "acuerdo."]) yield tok;
  },
};

describe("DebateRouter (K5)", () => {
  const router = new DebateRouter(new AgentRunner(fakeLlm));

  it("devuelve null si no hay tensión suficiente", () => {
    const postures: Posture[] = [
      { agent: "marco", text: "Posicionamiento de largo plazo importante." },
      { agent: "elena", text: "Posicionamiento de largo plazo importante." },
      { agent: "rafael", text: "Posicionamiento de largo plazo importante." },
    ];
    expect(router.plan(postures)).toBeNull();
  });

  it("planifica una réplica entre el par con mayor contradicción", () => {
    const postures: Posture[] = [
      {
        agent: "marco",
        text:
          "La oportunidad de crecimiento de mercado justifica el riesgo a 24 meses.",
      },
      {
        agent: "elena",
        text:
          "Sin embargo, el costo del peor escenario realista no es sostenible: pérdida grande y runway corto.",
      },
      {
        agent: "rafael",
        text:
          "Hay un supuesto no verificado: que el mercado se moverá en tu favor.",
      },
    ];
    const plan = router.plan(postures);
    expect(plan).not.toBeNull();
    const pair = new Set([plan!.speaker, plan!.respondingTo]);
    // Marco y Elena son el par más contradictorio (largo plazo vs. downside).
    expect(pair.has("marco")).toBe(true);
    expect(pair.has("elena")).toBe(true);
  });

  it("usa contexto reducido: solo la postura del agente al que responde", () => {
    const postures: Posture[] = [
      {
        agent: "marco",
        text:
          "Vale tomar el riesgo del pivote por el upside a dos años.",
      },
      {
        agent: "elena",
        text:
          "El downside es enorme: sin embargo, perder seis meses de runway sin retorno mata la operación.",
      },
      {
        agent: "rafael",
        text:
          "El supuesto que no has verificado es que tienes 6 meses; quizá tienes 3.",
      },
    ];
    const plan = router.plan(postures);
    expect(plan).not.toBeNull();
    const respondsTo = postures.find((p) => p.agent === plan!.respondingTo)!;
    expect(plan!.otherAgentPosture).toBe(respondsTo.text);
  });

  it("startReplica devuelve plan + stream consumible", async () => {
    const postures: Posture[] = [
      {
        agent: "marco",
        text: "Apostar fuerte a 24 meses tiene sentido por el upside del posicionamiento.",
      },
      {
        agent: "elena",
        text: "Sin embargo, el costo del peor escenario realista es perder seis meses de runway sin retorno.",
      },
    ];
    const out = router.startReplica({
      postures,
      userContext: {
        surveyVersion: "v1",
        decisionType: "negocio",
        ageRange: "25_34",
        urgency: "este_mes",
        needFromCouncil: "estructurar",
        fearedLoss: "perder_tiempo",
      },
      userMessage: "...",
    });
    expect(out).not.toBeNull();

    let text = "";
    for await (const t of out!.stream) text += t;
    expect(text.length).toBeGreaterThan(0);
  });
});
