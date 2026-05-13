import { describe, expect, it } from "vitest";
import { calibrate, activeAgents } from "./intentCalibrator";
import type { UserContext } from "@/lib/survey/survey.v1";

function ctx(overrides: Partial<UserContext> = {}): UserContext {
  return {
    surveyVersion: "v1",
    decisionType: "negocio",
    ageRange: "25_34",
    urgency: "este_mes",
    needFromCouncil: "estructurar",
    fearedLoss: "perder_tiempo",
    ...overrides,
  };
}

describe("IntentCalibrator (K1)", () => {
  it("decisión emocional pura atenúa a Marco", () => {
    const r = calibrate(ctx({ decisionType: "relacion", fearedLoss: "arrepentirme" }));
    expect(r.attenuated).toContain("marco");
    expect(activeAgents(ctx({ decisionType: "relacion", fearedLoss: "arrepentirme" }))).not.toContain("marco");
  });

  it("dinero + decidir entre opciones atenúa a Rafael", () => {
    const r = calibrate(ctx({ decisionType: "dinero", needFromCouncil: "decidir_entre_opciones" }));
    expect(r.attenuated).toContain("rafael");
  });

  it("urgencia hoy + estructurar atenúa a Elena", () => {
    const r = calibrate(ctx({ urgency: "hoy", needFromCouncil: "estructurar" }));
    expect(r.attenuated).toContain("elena");
  });

  it("decisión de negocio prioriza a Marco en pesos", () => {
    const r = calibrate(
      ctx({ decisionType: "negocio", fearedLoss: "decepcionar" }),
    );
    expect(r.weights.marco).toBeGreaterThan(r.weights.elena);
  });

  it("confrontar prioriza a Rafael", () => {
    const r = calibrate(ctx({ needFromCouncil: "confrontar" }));
    expect(r.weights.rafael).toBeGreaterThanOrEqual(r.weights.elena);
  });

  it("nunca atenúa a los tres agentes a la vez", () => {
    const r = calibrate(ctx());
    expect(r.attenuated.length).toBeLessThan(3);
  });
});
