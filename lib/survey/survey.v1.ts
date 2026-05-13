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
    title: "¿Qué te tiene así estos días?",
    options: [
      { value: "negocio", label: "Algo del negocio o de algún proyecto" },
      { value: "dinero", label: "Algo con dinero o con lo material" },
      { value: "carrera", label: "Algo del trabajo o de mi carrera" },
      { value: "relacion", label: "Algo con una persona importante" },
      { value: "creativa", label: "Una decisión creativa o de producto" },
      { value: "vida", label: "Algo más grande, sobre cómo quiero vivir" },
    ],
  } satisfies Question<DecisionType>,
  {
    id: "urgency",
    title: "¿Cuánto te aprieta el tiempo?",
    options: [
      { value: "hoy", label: "Tengo que decidir pronto, esta semana" },
      { value: "este_mes", label: "Tengo este mes, más o menos" },
      { value: "explorando", label: "Aún estoy mirándolo, sin prisa" },
    ],
  } satisfies Question<Urgency>,
  {
    id: "needFromCouncil",
    title: "¿Qué te haría falta de esta conversación?",
    options: [
      { value: "confrontar", label: "Que me ayuden a ver lo que estoy evitando" },
      { value: "estructurar", label: "Que me ayuden a poner orden a esto" },
      { value: "mostrar_caminos", label: "Que me muestren caminos que no veo" },
      {
        value: "decidir_entre_opciones",
        label: "Que me ayuden a elegir entre opciones que ya tengo",
      },
    ],
  } satisfies Question<NeedFromCouncil>,
  {
    id: "fearedLoss",
    title: "Si esto sale mal, ¿qué te dolería más perder?",
    options: [
      { value: "perder_dinero", label: "Dinero o algo material" },
      { value: "perder_tiempo", label: "Tiempo de vida" },
      { value: "arrepentirme", label: "Quedarme con la sensación de arrepentimiento" },
      { value: "decepcionar", label: "Que alguien importante se decepcione" },
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
