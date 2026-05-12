import { describe, expect, it } from "vitest";
import {
  checkAll,
  elenaNoCheapOptimism,
  hasErrors,
  lengthBounded,
  marcoNoTacticalImmediate,
  noAgentNamesInInitial,
  noEmojis,
  noFelicitation,
  noRecommendation,
  rafaelSingleQuestion,
  type CheckContext,
} from "./rules";

function ctx(over: Partial<CheckContext> = {}): CheckContext {
  return {
    agent: "marco",
    phase: "initial",
    text: "Texto base sin patrones prohibidos.",
    ...over,
  };
}

describe("Rules · no_recommendation", () => {
  it("captura 'yo en tu lugar'", () => {
    const v = noRecommendation(ctx({ text: "Yo en tu lugar tomaría la oferta." }));
    expect(v.length).toBe(1);
    expect(v[0].severity).toBe("error");
  });

  it("captura 'te recomiendo'", () => {
    const v = noRecommendation(ctx({ text: "Te recomiendo pivotar." }));
    expect(v.length).toBe(1);
  });

  it("no se activa sobre texto neutral", () => {
    expect(noRecommendation(ctx({ text: "Hay dos caminos visibles." }))).toEqual([]);
  });
});

describe("Rules · no_felicitation", () => {
  it("captura 'buena pregunta'", () => {
    const v = noFelicitation(ctx({ text: "Buena pregunta. Aquí mi análisis." }));
    expect(v.length).toBe(1);
  });

  it("no se activa sobre análisis técnico", () => {
    expect(
      noFelicitation(ctx({ text: "El downside es perder 6 meses de runway." })),
    ).toEqual([]);
  });
});

describe("Rules · no_agent_names_in_initial", () => {
  it("captura mención de otro agente en fase 1", () => {
    const v = noAgentNamesInInitial(
      ctx({ text: "Como dijo Marco, hay un horizonte largo aquí.", agent: "elena" }),
    );
    expect(v.length).toBe(1);
  });

  it("permite mención durante la fase de réplica", () => {
    expect(
      noAgentNamesInInitial(
        ctx({
          phase: "replica",
          text: "Marco, no estoy de acuerdo con tu marco temporal.",
          agent: "elena",
        }),
      ),
    ).toEqual([]);
  });
});

describe("Rules · longitud", () => {
  it("warning si el texto es demasiado corto en fase 1", () => {
    const v = lengthBounded(ctx({ text: "Una línea." }));
    expect(v.length).toBe(1);
    expect(v[0].rule).toBe("length_too_short");
  });

  it("permite longitud saludable", () => {
    const words = Array.from({ length: 180 }, (_, i) => `palabra${i}`).join(" ");
    expect(lengthBounded(ctx({ text: words }))).toEqual([]);
  });
});

describe("Rules · específicas por agente", () => {
  it("Rafael sin ninguna pregunta → error", () => {
    const v = rafaelSingleQuestion(
      ctx({ agent: "rafael", text: "Aquí solo afirmaciones. Sin preguntas." }),
    );
    expect(v.length).toBe(1);
    expect(v[0].severity).toBe("error");
  });

  it("Rafael con 5 preguntas → warning", () => {
    const v = rafaelSingleQuestion(
      ctx({
        agent: "rafael",
        text: "¿A? ¿B? ¿C? ¿D? ¿E? Algo así dirías; demasiadas preguntas.",
      }),
    );
    expect(v.length).toBe(1);
    expect(v[0].severity).toBe("warning");
  });

  it("Marco con verbo imperativo táctico → warning", () => {
    const v = marcoNoTacticalImmediate(
      ctx({ agent: "marco", text: "Llama hoy a tu inversionista y agenda algo." }),
    );
    expect(v.length).toBeGreaterThan(0);
  });

  it("Elena con optimismo barato → error", () => {
    const v = elenaNoCheapOptimism(
      ctx({ agent: "elena", text: "No te preocupes, todo va a estar bien." }),
    );
    expect(v.length).toBe(1);
    expect(v[0].severity).toBe("error");
  });
});

describe("Rules · no_emojis", () => {
  it("captura emoji", () => {
    expect(noEmojis(ctx({ text: "Buen plan 🎯, sigue así." }))).not.toEqual([]);
  });
});

describe("Rules · checkAll + hasErrors", () => {
  it("compone violaciones de toda la suite y distingue severidad", () => {
    const violations = checkAll({
      agent: "rafael",
      phase: "initial",
      text:
        "Buena pregunta. Te recomiendo seguir con la opción A. Sin preguntas.",
    });
    expect(violations.length).toBeGreaterThan(0);
    expect(hasErrors(violations)).toBe(true);
  });
});
