import type { AgentId } from "@/lib/agents/ids";

/**
 * Perfiles de voz por agente para la Web Speech API.
 *
 * No exigimos una voz específica del navegador (cada SO trae un set distinto):
 * preferimos atributos cualitativos y dejamos al hook que elija la mejor voz
 * disponible que coincida.
 *
 * Filosofía:
 * - Marco (Estratega): grave, pausado, sereno.
 * - Elena (Riesgo): media, firme, presente.
 * - Rafael (Crítico): un poco más rápida, masculina/neutra, directa.
 *
 * `voiceHints` son fragmentos de nombres de voces de macOS/Windows/Chrome
 * conocidos por sonar bien en español neutro. El hook intenta hacer match en
 * orden y cae a la voz por defecto del idioma si ninguno aparece.
 */
export type VoiceGenderHint = "male" | "female" | "neutral";

export interface AgentVoiceProfile {
  rate: number;
  pitch: number;
  lang: string;
  gender: VoiceGenderHint;
  voiceHints: ReadonlyArray<string>;
}

export const AGENT_VOICE_PROFILES: Record<AgentId, AgentVoiceProfile> = {
  marco: {
    rate: 0.9,
    pitch: 0.85,
    lang: "es-MX",
    gender: "male",
    voiceHints: [
      "Jorge",
      "Diego",
      "Paulina",
      "Google español",
      "Microsoft Jorge",
      "Spanish",
    ],
  },
  elena: {
    rate: 0.95,
    pitch: 1.05,
    lang: "es-MX",
    gender: "female",
    voiceHints: [
      "Paulina",
      "Mónica",
      "Monica",
      "Helena",
      "Google español",
      "Microsoft Sabina",
      "Spanish",
    ],
  },
  rafael: {
    rate: 1.02,
    pitch: 0.95,
    lang: "es-MX",
    gender: "male",
    voiceHints: [
      "Diego",
      "Jorge",
      "Juan",
      "Google español",
      "Microsoft Pablo",
      "Spanish",
    ],
  },
};
