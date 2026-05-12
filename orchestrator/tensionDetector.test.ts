import { describe, expect, it } from "vitest";
import { detectTension } from "./tensionDetector";

describe("TensionDetector (K4)", () => {
  it("detecta el par con menor overlap como mayor contradicción", () => {
    const postures = [
      {
        agent: "marco" as const,
        text: "Conviene posicionarte para el horizonte de 24 meses: la oportunidad de mercado se mantiene si construyes distribución temprana.",
      },
      {
        agent: "elena" as const,
        text: "El downside es perder seis meses de runway sin retorno; sin embargo, el costo emocional acumulado puede ser mayor.",
      },
      {
        agent: "rafael" as const,
        text: "Conviene posicionarte para el horizonte de 24 meses: oportunidad de mercado, distribución temprana, posicionamiento.",
      },
    ];

    const res = detectTension(postures);
    expect(res).not.toBeNull();
    const pair = new Set([res!.a, res!.b]);
    expect(pair.has("elena")).toBe(true);
  });

  it("devuelve null cuando no hay contradicción significativa", () => {
    const postures = [
      { agent: "marco" as const, text: "Posicionamiento de largo plazo importante." },
      { agent: "elena" as const, text: "Posicionamiento de largo plazo importante." },
      { agent: "rafael" as const, text: "Posicionamiento de largo plazo importante." },
    ];
    expect(detectTension(postures, { threshold: 0.4 })).toBeNull();
  });

  it("score crece con marcadores de contraste explícitos", () => {
    const low = detectTension([
      { agent: "marco" as const, text: "Hay tres caminos posibles bien definidos." },
      { agent: "elena" as const, text: "Hay tres opciones posibles bien definidas." },
    ]);
    const high = detectTension([
      {
        agent: "marco" as const,
        text: "La oportunidad de crecimiento justifica el riesgo a 24 meses.",
      },
      {
        agent: "elena" as const,
        text: "Sin embargo, el costo del peor escenario realista no es sostenible: pérdida grande, runway corto.",
      },
    ]);
    expect((high?.score ?? 0)).toBeGreaterThan(low?.score ?? 0);
  });
});
