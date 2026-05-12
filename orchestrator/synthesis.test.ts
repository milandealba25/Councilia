import { describe, expect, it } from "vitest";
import {
  renderSynthesisMarkdown,
  synthesisSchema,
  validateSynthesis,
} from "./synthesis";

describe("SynthesisGenerator (K6) — contract", () => {
  const validSynthesis = {
    paths: [
      "Sostener la decisión actual y reducir exposición durante 90 días.",
      "Cambiar de marco: aceptar pérdida puntual a cambio de optar por algo nuevo.",
    ],
    tradeoffs: [
      "Continuidad estable vs. costo emocional acumulado que sigue creciendo.",
    ],
    closing:
      "Esto no se resuelve con lógica: depende de qué estás dispuesto a aceptar en los próximos meses.",
  };

  it("acepta una síntesis válida", () => {
    const parsed = synthesisSchema.parse(validSynthesis);
    expect(parsed.paths.length).toBeGreaterThanOrEqual(2);
  });

  it("rechaza menos de 2 caminos", () => {
    expect(() =>
      synthesisSchema.parse({ ...validSynthesis, paths: ["solo uno"] }),
    ).toThrow();
  });

  it("validateSynthesis detecta lenguaje de recomendación", () => {
    const v = validateSynthesis({
      ...validSynthesis,
      closing: "Yo en tu lugar elegiría el primer camino sin dudar.",
    });
    expect(v.ok).toBe(false);
  });

  it("validateSynthesis detecta mención a un agente", () => {
    const v = validateSynthesis({
      ...validSynthesis,
      tradeoffs: ["Marco diría que esperes; Elena diría que pares ya."],
    });
    expect(v.ok).toBe(false);
  });

  it("renderiza markdown con la estructura fija", () => {
    const md = renderSynthesisMarkdown(validSynthesis);
    expect(md).toContain("Caminos visibles");
    expect(md).toContain("Tradeoffs irreductibles");
    expect(md).toContain("Lo que esto te pide decidir");
  });
});
