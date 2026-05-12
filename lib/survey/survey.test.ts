import { describe, expect, it } from "vitest";
import {
  renderUserContextBlock,
  surveyV1Questions,
  userContextSchema,
} from "./survey.v1";

describe("Survey v1 (C1)", () => {
  it("valida un userContext correcto", () => {
    const parsed = userContextSchema.parse({
      surveyVersion: "v1",
      decisionType: "carrera",
      urgency: "este_mes",
      needFromCouncil: "confrontar",
      fearedLoss: "arrepentirme",
    });
    expect(parsed.decisionType).toBe("carrera");
  });

  it("rechaza valores no permitidos", () => {
    expect(() =>
      userContextSchema.parse({
        surveyVersion: "v1",
        decisionType: "otra-cosa",
        urgency: "este_mes",
        needFromCouncil: "confrontar",
        fearedLoss: "arrepentirme",
      }),
    ).toThrow();
  });

  it("expone exactamente 4 preguntas en el orden documentado", () => {
    expect(surveyV1Questions.length).toBe(4);
    expect(surveyV1Questions.map((q) => q.id)).toEqual([
      "decisionType",
      "urgency",
      "needFromCouncil",
      "fearedLoss",
    ]);
  });

  it("renderUserContextBlock produce bloque estructurado, no prosa", () => {
    const block = renderUserContextBlock({
      surveyVersion: "v1",
      decisionType: "negocio",
      urgency: "hoy",
      needFromCouncil: "estructurar",
      fearedLoss: "perder_dinero",
    });
    expect(block).toContain("<user_context>");
    expect(block).toContain("decisionType: negocio");
    expect(block).toContain("</user_context>");
  });
});
