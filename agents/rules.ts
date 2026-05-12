import type { AgentId } from "@/lib/agents/ids";

/**
 * Reglas duras de los agentes (doc 04, §7 y §3) traducidas a checks programáticos.
 *
 * Filosofía: mejor un check estricto y un poco falso-positivo que dejar pasar
 * una recomendación encubierta. La iteración de prompts (L6) baja la tasa de
 * violación; el evaluador la mide objetivamente.
 *
 * Severity:
 *   - "error":   viola un principio del producto. La salida es inaceptable.
 *   - "warning": señal de degradación. Pasa por revisión humana antes de release.
 */

export type Severity = "error" | "warning";

export interface RuleViolation {
  rule: string;
  severity: Severity;
  message: string;
  match?: string;
}

export interface CheckContext {
  agent: AgentId;
  phase: "initial" | "replica";
  text: string;
}

export type RuleCheck = (ctx: CheckContext) => RuleViolation[];

/* ── Patrones reutilizables ──────────────────────────────────────────────── */

const RECOMMENDATION_PATTERNS: RegExp[] = [
  /\byo en tu lugar\b/i,
  /\bte recomiendo\b/i,
  /\bte sugiero\b/i,
  /\blo mejor (es|sería|seria)\b/i,
  /\bdeber[íi]as\b/i,
  /\bopta por\b/i,
  /\bla respuesta es\b/i,
  /\bmi consejo (es|sería|seria)\b/i,
  /\bsi fuera tú\b/i,
];

const FELICITATION_PATTERNS: RegExp[] = [
  /\bbuena pregunta\b/i,
  /\bgran pregunta\b/i,
  /\bqué bien\b/i,
  /\bme alegra\b/i,
  /\bfelicidades\b/i,
  /\bvas muy bien\b/i,
  /\bes genial\b/i,
  /\bes maravilloso\b/i,
];

const AGENT_NAME_IDS = ["marco", "elena", "rafael"] as const;

/**
 * "marco" es un sustantivo común en español ("marco temporal", "marco de
 * referencia", "marco regulatorio"). Para evitar falsos positivos, sólo
 * disparamos sobre la palabra cuando NO va seguida de uno de estos sustantivos
 * de uso técnico común.
 */
const MARCO_COMMON_NOUN_EXCLUSION =
  /(?:temporal|de\s+(?:referencia|tiempo|análisis|analisis|decisión|decision)|regulatorio|competitivo|mental|conceptual|legal|teórico|teorico|estratégico|estrategico|narrativo)/i;

const EMOJI_PATTERN =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2700}-\u{27BF}]/u;

// Verbos imperativos que sugieren táctica inmediata (Marco no debe usar en fase 1).
const TACTICAL_IMPERATIVES: RegExp[] = [
  /\bhaz\s+(esto|lo siguiente|x|y|hoy|mañana)\b/i,
  /\benvíale?\b/i,
  /\bagenda\b/i,
  /\bllama (hoy|ya|inmediatamente)\b/i,
];

// "Optimismo barato" en Elena: minimiza el costo.
const ELENA_OPTIMISM_PATTERNS: RegExp[] = [
  /\bno te preocupes\b/i,
  /\btodo va a (estar|salir) bien\b/i,
  /\bno es para tanto\b/i,
  /\bes manejable\b/i,
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function findFirstMatch(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[0];
  }
  return null;
}

function countQuestions(text: string): number {
  return (text.match(/[¿\?]/g) ?? []).length;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

/* ── Reglas comunes a los 3 agentes ──────────────────────────────────────── */

export const noRecommendation: RuleCheck = ({ text }) => {
  const m = findFirstMatch(text, RECOMMENDATION_PATTERNS);
  return m
    ? [
        {
          rule: "no_recommendation",
          severity: "error",
          message: "El agente está dando una recomendación final.",
          match: m,
        },
      ]
    : [];
};

export const noFelicitation: RuleCheck = ({ text }) => {
  const m = findFirstMatch(text, FELICITATION_PATTERNS);
  return m
    ? [
        {
          rule: "no_felicitation",
          severity: "error",
          message: "El agente felicita al usuario (prohibido, doc 04 §7.3).",
          match: m,
        },
      ]
    : [];
};

export const noAgentNamesInInitial: RuleCheck = ({ text, phase, agent }) => {
  if (phase !== "initial") return [];

  for (const other of AGENT_NAME_IDS) {
    if (other === agent) continue; // mencionarse a sí mismo no es la violación
    const re = new RegExp(`\\b${other}\\b`, "gi");
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const tail = text.slice(match.index + match[0].length, match.index + match[0].length + 32);
      // Exclusión específica para "marco" como sustantivo común.
      if (
        other === "marco" &&
        MARCO_COMMON_NOUN_EXCLUSION.test(tail.trimStart())
      ) {
        continue;
      }
      return [
        {
          rule: "no_agent_names_in_initial",
          severity: "error",
          message:
            "En fase 1 ningún agente menciona a otro por nombre (doc 04 §7.1).",
          match: match[0],
        },
      ];
    }
  }
  return [];
};

export const noEmojis: RuleCheck = ({ text }) => {
  return EMOJI_PATTERN.test(text)
    ? [
        {
          rule: "no_emojis",
          severity: "warning",
          message: "La salida contiene emojis.",
          match: text.match(EMOJI_PATTERN)?.[0],
        },
      ]
    : [];
};

/**
 * Longitud entre ~150 y ~250 tokens. Como TS no tokeniza con el tokenizador
 * del modelo, aproximamos por palabras: ~1.3 palabras/token en español →
 * ~115–325 palabras como banda saludable.
 */
export const lengthBounded: RuleCheck = ({ text, phase }) => {
  const min = phase === "initial" ? 100 : 80;
  const max = phase === "initial" ? 340 : 260;
  const words = wordCount(text);
  if (words < min) {
    return [
      {
        rule: "length_too_short",
        severity: "warning",
        message: `Respuesta corta (${words} palabras, mínimo recomendado ${min}).`,
      },
    ];
  }
  if (words > max) {
    return [
      {
        rule: "length_too_long",
        severity: "warning",
        message: `Respuesta excede el límite (${words} palabras, máximo ${max}).`,
      },
    ];
  }
  return [];
};

/* ── Reglas específicas por agente ───────────────────────────────────────── */

export const rafaelSingleQuestion: RuleCheck = ({ text, agent, phase }) => {
  if (agent !== "rafael" || phase !== "initial") return [];
  const q = countQuestions(text);
  if (q === 0) {
    return [
      {
        rule: "rafael_zero_questions",
        severity: "error",
        message: "Rafael debe hacer al menos una pregunta dura.",
      },
    ];
  }
  if (q > 3) {
    return [
      {
        rule: "rafael_too_many_questions",
        severity: "warning",
        message: `Rafael formuló ${q} preguntas; una sola pregunta dura es la pauta.`,
      },
    ];
  }
  return [];
};

export const marcoNoTacticalImmediate: RuleCheck = ({ agent, text, phase }) => {
  if (agent !== "marco" || phase !== "initial") return [];
  const m = findFirstMatch(text, TACTICAL_IMPERATIVES);
  return m
    ? [
        {
          rule: "marco_tactical_immediate",
          severity: "warning",
          message:
            "Marco está dando consejo táctico inmediato; debe elevar al horizonte de 12–24 meses.",
          match: m,
        },
      ]
    : [];
};

export const elenaNoCheapOptimism: RuleCheck = ({ agent, text }) => {
  if (agent !== "elena") return [];
  const m = findFirstMatch(text, ELENA_OPTIMISM_PATTERNS);
  return m
    ? [
        {
          rule: "elena_cheap_optimism",
          severity: "error",
          message:
            "Elena está minimizando el costo (pinta optimismo); debe nombrar magnitudes.",
          match: m,
        },
      ]
    : [];
};

/* ── Suite por defecto ───────────────────────────────────────────────────── */

export const DEFAULT_RULE_SUITE: ReadonlyArray<RuleCheck> = [
  noRecommendation,
  noFelicitation,
  noAgentNamesInInitial,
  noEmojis,
  lengthBounded,
  rafaelSingleQuestion,
  marcoNoTacticalImmediate,
  elenaNoCheapOptimism,
];

/**
 * Aplica una suite de checks; devuelve TODAS las violaciones encontradas.
 */
export function checkAll(
  ctx: CheckContext,
  suite: ReadonlyArray<RuleCheck> = DEFAULT_RULE_SUITE,
): RuleViolation[] {
  return suite.flatMap((check) => check(ctx));
}

export function hasErrors(violations: ReadonlyArray<RuleViolation>): boolean {
  return violations.some((v) => v.severity === "error");
}
