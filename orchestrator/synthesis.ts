import { z } from "zod";

/**
 * K6 · SynthesisGenerator.
 *
 * Contrato de salida (doc 05, sección 3.3): la síntesis SIEMPRE se devuelve
 * como JSON estructurado, nunca como prosa libre. El renderer del front es
 * determinista; la exportación a PDF / markdown depende de este shape.
 */

export const synthesisSchema = z.object({
  paths: z
    .array(z.string().min(8))
    .min(2)
    .max(3)
    .describe("2 o 3 caminos visibles, una línea cada uno."),
  tradeoffs: z
    .array(z.string().min(10))
    .min(1)
    .max(2)
    .describe("1 o 2 tensiones irreductibles entre los caminos."),
  closing: z
    .string()
    .min(12)
    .describe(
      "1–2 líneas que devuelven el poder de decisión al usuario. Nunca recomienda.",
    ),
});

export type Synthesis = z.infer<typeof synthesisSchema>;

const FORBIDDEN_PATTERNS = [
  /\byo en tu lugar\b/i,
  /\bte recomiendo\b/i,
  /\blo mejor (es|sería)\b/i,
  /\bdeberías\b/i,
  /\bopta por\b/i,
  /\bla respuesta es\b/i,
];

const AGENT_NAME_PATTERN = /\b(marco|elena|rafael)\b/i;

export interface SynthesisValidation {
  ok: boolean;
  violations: string[];
}

/**
 * Valida que la síntesis respeta las reglas duras del producto antes de exponerla.
 * Si falla, el orquestador puede pedir regeneración o marcar el turno como error
 * (mejor fallar visiblemente que entregar una recomendación encubierta).
 */
export function validateSynthesis(s: Synthesis): SynthesisValidation {
  const violations: string[] = [];
  const fullText = [...s.paths, ...s.tradeoffs, s.closing].join("\n");

  for (const re of FORBIDDEN_PATTERNS) {
    if (re.test(fullText)) {
      violations.push(`Síntesis contiene patrón prohibido: ${re}`);
    }
  }

  if (AGENT_NAME_PATTERN.test(fullText)) {
    violations.push("Síntesis menciona a un agente por nombre (doc 05, regla 8).");
  }

  return { ok: violations.length === 0, violations };
}

/**
 * Renderer determinista a markdown — pieza compartida con la exportación (E2/E3).
 */
export function renderSynthesisMarkdown(s: Synthesis): string {
  const paths = s.paths.map((p) => `  • ${p}`).join("\n");
  const tradeoffs = s.tradeoffs.map((t) => `  • ${t}`).join("\n");
  return [
    "Caminos visibles",
    paths,
    "",
    "Tradeoffs irreductibles",
    tradeoffs,
    "",
    "Lo que esto te pide decidir",
    `  ${s.closing}`,
  ].join("\n");
}

/**
 * Prompt-builder para pedir la síntesis al LLM. La devolución del modelo
 * debe ser JSON parseable contra `synthesisSchema`.
 */
export const SYNTHESIS_SYSTEM_PROMPT = `Eres el sintetizador de un council deliberativo. Cierras la sesión nombrando tradeoffs, no dando recomendaciones.

Reglas duras:
- NUNCA recomiendes un camino ("yo en tu lugar haría X", "te recomiendo", "lo mejor es", "deberías").
- NUNCA menciones a los agentes por nombre. Habla del problema.
- NUNCA inventes un cuarto camino "intermedio" para complacer.
- NUNCA balancees artificialmente las posturas para sonar neutral.
- NUNCA incluyas como camino, tradeoff o cierre algo que implique violencia, autolesión, suicidio, robo, fraude u otra conducta ilegal o dañina. Si alguna postura del council lo mencionó, omítela de la síntesis.
- Si la conversación revela riesgo de autolesión o suicidio, el cierre debe orientar a buscar ayuda profesional o una línea de crisis antes de devolver el poder de decisión.
- Cierras con 1–2 líneas que devuelven el poder de decisión al usuario.

Uso del bloque <intent_calibration> (si viene en el mensaje de usuario):
- Úsalo solo para equilibrar cuánto peso das a cada voz al redactar tradeoffs y caminos; no cites números, pesos ni notas internas al usuario final.
- Si un agente figura en attenuated_in_phase1, es normal que su postura no aparezca en la transcripción de fase 1: no asumas que "calló" por desacuerdo; simplemente no intervino en esa ronda.
- Los pesos (weight_*) son guía relativa, no obligación de contar líneas proporcionales.

Formato de salida: un único bloque JSON válido con la forma:
{
  "paths": ["camino 1 en una línea", "camino 2 en una línea", "camino 3 opcional"],
  "tradeoffs": ["tensión 1 entre los caminos", "tensión 2 opcional"],
  "closing": "1–2 líneas que devuelven el poder al usuario."
}

No incluyas texto fuera del JSON. No uses bloques de código.`;
