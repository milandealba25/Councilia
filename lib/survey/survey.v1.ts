import { z } from "zod";

/**
 * Esquema versionado de la encuesta de onboarding (C1).
 *
 * Contrato entre la UI de la encuesta y el orquestador: mientras
 * `userContext` se mantenga estable, la encuesta puede evolucionar
 * (copy, A/B tests) sin romper persistencia ni el IntentCalibrator.
 *
 * Doc fuente: docs/03_encuesta_onboarding.md
 */
export const SURVEY_VERSION = "v1" as const;

export const decisionTypeValues = [
  "negocio",
  "dinero",
  "carrera",
  "relacion",
  "creativa",
  "vida",
] as const;
export type DecisionType = (typeof decisionTypeValues)[number];

export const urgencyValues = ["hoy", "este_mes", "explorando"] as const;
export type Urgency = (typeof urgencyValues)[number];

export const needFromCouncilValues = [
  "confrontar",
  "estructurar",
  "mostrar_caminos",
  "decidir_entre_opciones",
] as const;
export type NeedFromCouncil = (typeof needFromCouncilValues)[number];

export const fearedLossValues = [
  "perder_dinero",
  "perder_tiempo",
  "arrepentirme",
  "decepcionar",
] as const;
export type FearedLoss = (typeof fearedLossValues)[number];

export const userContextSchema = z.object({
  surveyVersion: z.literal(SURVEY_VERSION),
  decisionType: z.enum(decisionTypeValues),
  urgency: z.enum(urgencyValues),
  needFromCouncil: z.enum(needFromCouncilValues),
  fearedLoss: z.enum(fearedLossValues),
});

export type UserContext = z.infer<typeof userContextSchema>;

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Question<T extends string> {
  id: keyof Omit<UserContext, "surveyVersion">;
  title: string;
  options: ReadonlyArray<Option<T>>;
}

export const surveyV1Questions = [
  {
    id: "decisionType",
    title: "¿Qué tipo de decisión vas a poner sobre la mesa?",
    options: [
      { value: "negocio", label: "Negocio / estrategia" },
      { value: "dinero", label: "Dinero / finanzas" },
      { value: "carrera", label: "Carrera / trabajo" },
      { value: "relacion", label: "Relación personal" },
      { value: "creativa", label: "Producto / creativa" },
      { value: "vida", label: "Vida en general" },
    ],
  } satisfies Question<DecisionType>,
  {
    id: "urgency",
    title: "¿Cuánta presión de tiempo tienes?",
    options: [
      { value: "hoy", label: "Hoy / esta semana" },
      { value: "este_mes", label: "Este mes" },
      { value: "explorando", label: "Estoy explorando, sin prisa" },
    ],
  } satisfies Question<Urgency>,
  {
    id: "needFromCouncil",
    title: "¿Qué necesitas que el council haga contigo?",
    options: [
      { value: "confrontar", label: "Que me confronten lo que estoy evitando ver" },
      { value: "estructurar", label: "Que me ayuden a estructurar el problema" },
      { value: "mostrar_caminos", label: "Que me muestren caminos que no veo" },
      {
        value: "decidir_entre_opciones",
        label: "Que me ayuden a decidir entre opciones que ya tengo",
      },
    ],
  } satisfies Question<NeedFromCouncil>,
  {
    id: "fearedLoss",
    title: "¿Qué riesgo te molestaría más equivocarte?",
    options: [
      { value: "perder_dinero", label: "Perder dinero o recursos" },
      { value: "perder_tiempo", label: "Perder tiempo" },
      { value: "arrepentirme", label: "Arrepentirme emocionalmente" },
      { value: "decepcionar", label: "Decepcionar a alguien" },
    ],
  } satisfies Question<FearedLoss>,
] as const;

/**
 * Renderiza userContext como bloque inyectable en system prompts.
 * Formato estructurado deliberado (no prosa) para evitar "interpretación" del modelo.
 */
export function renderUserContextBlock(ctx: UserContext): string {
  return [
    "<user_context>",
    `  decisionType: ${ctx.decisionType}`,
    `  urgency: ${ctx.urgency}`,
    `  needFromCouncil: ${ctx.needFromCouncil}`,
    `  fearedLoss: ${ctx.fearedLoss}`,
    "</user_context>",
  ].join("\n");
}
