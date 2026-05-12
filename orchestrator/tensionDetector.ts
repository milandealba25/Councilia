import type { AgentId } from "@/lib/agents/ids";

/**
 * K4 · TensionDetector heurístico (sin LLM).
 *
 * Recibe un mapa { agentId -> texto de postura } y devuelve el par con
 * mayor "contradicción semántica" según una heurística barata:
 *
 *   1) Normaliza textos a tokens (sin stopwords, sin puntuación).
 *   2) Calcula overlap léxico (Jaccard) entre cada par.
 *   3) Pondera por presencia de marcadores de contraposición
 *      (negaciones, contrastes, riesgos vs. oportunidades).
 *   4) Devuelve el par con menor overlap + mayor densidad de contraste.
 *
 * Si no encuentra contradicción razonable (todas muy parecidas), devuelve null
 * — el orquestador saltará la réplica (doc 05, sección 1, "Fase 2").
 */

interface Posture {
  agent: AgentId;
  text: string;
}

export interface TensionPair {
  a: AgentId;
  b: AgentId;
  score: number;
  reason: string;
}

const STOPWORDS = new Set([
  "a", "al", "ante", "bajo", "cabe", "con", "contra", "de", "del", "desde",
  "durante", "en", "entre", "hacia", "hasta", "mediante", "para", "por",
  "según", "sin", "so", "sobre", "tras", "versus", "vía",
  "el", "la", "los", "las", "un", "una", "unos", "unas", "y", "o", "u", "e",
  "que", "qué", "como", "cómo", "si", "sí", "no", "ni", "pero", "porque",
  "cuando", "cuál", "cuales", "esto", "eso", "esta", "este", "esa", "ese",
  "muy", "más", "menos", "ya", "aún", "también", "tampoco", "lo", "le",
  "se", "me", "te", "nos", "os", "su", "sus", "mi", "mis", "tu", "tus",
  "ser", "estar", "haber", "tener", "es", "son", "está", "están", "ha", "han",
  "fue", "fueron", "será", "serán", "puede", "pueden", "hace", "hacer",
]);

const CONTRAST_MARKERS = [
  "pero ", " sin embargo", " en cambio", " mientras que", " por el contrario",
  " no obstante", " a diferencia de", " riesgo", " coste", " costo", " pérdida",
  " perder", " ganar", " oportunidad", " peligro", " supuesto", " verificar",
  " no has", " no es claro", " no tienes", " falta evidencia",
];

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zñ0-9\s]/gi, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  a.forEach((t) => {
    if (b.has(t)) inter++;
  });
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function contrastDensity(s: string): number {
  const lower = " " + s.toLowerCase() + " ";
  let hits = 0;
  for (const m of CONTRAST_MARKERS) if (lower.includes(m)) hits++;
  return hits;
}

/**
 * Score más alto = más contradicción detectada.
 * Combina inverso del overlap (1 - jaccard) con contraste léxico normalizado.
 */
function pairScore(p1: Posture, p2: Posture): number {
  const overlap = jaccard(tokenize(p1.text), tokenize(p2.text));
  const contrast = contrastDensity(p1.text) + contrastDensity(p2.text);
  const contrastNorm = Math.min(contrast / 6, 1);
  return (1 - overlap) * 0.7 + contrastNorm * 0.3;
}

export interface DetectOptions {
  /** Umbral mínimo de score para considerar que hubo contradicción. */
  threshold?: number;
}

export function detectTension(
  postures: ReadonlyArray<Posture>,
  opts: DetectOptions = {},
): TensionPair | null {
  const threshold = opts.threshold ?? 0.35;
  if (postures.length < 2) return null;

  let best: TensionPair | null = null;
  for (let i = 0; i < postures.length; i++) {
    for (let j = i + 1; j < postures.length; j++) {
      const score = pairScore(postures[i], postures[j]);
      if (!best || score > best.score) {
        best = {
          a: postures[i].agent,
          b: postures[j].agent,
          score,
          reason: `overlap léxico bajo (${score.toFixed(2)})`,
        };
      }
    }
  }

  if (!best || best.score < threshold) return null;
  return best;
}
