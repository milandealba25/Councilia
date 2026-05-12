/**
 * M2 (versión base) · Detector heurístico de crisis.
 *
 * Cubre señales explícitas en español/inglés de ideación suicida, autolesión
 * y violencia doméstica. Esta primera versión es **deliberadamente
 * conservadora** (mejor un falso positivo que un falso negativo); M3 puede
 * añadir un clasificador ligero como segunda pasada.
 *
 * Cuando devuelve `{ triggered: true }`, el orquestador SUSPENDE el flujo
 * deliberativo (doc 09, principio 9) y la UI muestra Modo Soporte.
 */

export type CrisisCategory = "suicidal_ideation" | "self_harm" | "domestic_violence";

export interface CrisisResult {
  triggered: boolean;
  categories: CrisisCategory[];
  matchedTerms: string[];
}

interface PatternSet {
  category: CrisisCategory;
  patterns: RegExp[];
}

/**
 * Patrones con `\b` en castellano son frágiles por las tildes — usamos
 * normalización en `detectCrisis()` antes de matchear.
 */
const PATTERN_SETS: ReadonlyArray<PatternSet> = [
  {
    category: "suicidal_ideation",
    patterns: [
      /\bquiero (morir|desaparecer|acabar con esto|matarme)\b/i,
      /\bya no quiero (seguir|vivir|estar aqui|existir)\b/i,
      /\b(pensando|pienso) en (suicidarme|matarme|quitarme la vida)\b/i,
      /\bmejor (desaparecer|no estar|no existir)\b/i,
      /\bsuicid(io|arme|arse)\b/i,
      /\bend (it|my life)\b/i,
      /\bi want to die\b/i,
      /\bkill (myself|me)\b/i,
    ],
  },
  {
    category: "self_harm",
    patterns: [
      /\bautolesion(arme|es|arse)\b/i,
      /\bcortarme\b/i,
      /\bhacerme dano\b/i,
      /\bself.?harm\b/i,
      /\bcutting myself\b/i,
    ],
  },
  {
    category: "domestic_violence",
    patterns: [
      /\bme (golpea|pega|maltrata|amenaza)\b/i,
      /\bmi (pareja|esposo|esposa|novio|novia) me (pega|golpea|maltrata|amenaza)\b/i,
      /\b(violencia|abuso) (domestica|en casa|de pareja)\b/i,
      /\b(domestic violence|he hits me|she hits me|abus(es|ed) me)\b/i,
    ],
  },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function detectCrisis(input: string): CrisisResult {
  const normalized = normalize(input);
  const categories = new Set<CrisisCategory>();
  const matchedTerms: string[] = [];

  for (const set of PATTERN_SETS) {
    for (const re of set.patterns) {
      const m = normalized.match(re);
      if (m) {
        categories.add(set.category);
        matchedTerms.push(m[0]);
      }
    }
  }

  return {
    triggered: categories.size > 0,
    categories: Array.from(categories),
    matchedTerms,
  };
}
