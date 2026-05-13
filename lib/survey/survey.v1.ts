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

export const ageRangeValues = [
  "under_18",
  "18_24",
  "25_34",
  "35_44",
  "45_54",
  "55_64",
  "65_plus",
  "prefer_not_say",
] as const;
export type AgeRange = (typeof ageRangeValues)[number];

export const urgencyValues = [
  "hoy",
  "este_mes",
  "explorando",
  "no_urgente_presente",
] as const;
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
  "duda_si_debia_intentar",
] as const;
export type FearedLoss = (typeof fearedLossValues)[number];

export const userContextSchema = z.object({
  surveyVersion: z.literal(SURVEY_VERSION),
  decisionType: z.enum(decisionTypeValues),
  ageRange: z.enum(ageRangeValues),
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
    title: "¿Cómo se siente esto para ti ahorita?",
    options: [
      { value: "hoy", label: "Esto ya me está presionando" },
      { value: "este_mes", label: "Sé que tengo que moverlo pronto" },
      { value: "explorando", label: "Todavía lo estoy entendiendo" },
      {
        value: "no_urgente_presente",
        label: "No es urgente, pero no lo quiero ignorar",
      },
    ],
  } satisfies Question<Urgency>,
  {
    id: "needFromCouncil",
    title: "¿Qué sientes que más te está faltando en este momento?",
    options: [
      {
        value: "confrontar",
        label: "Ver algo que probablemente estoy evitando",
      },
      {
        value: "estructurar",
        label: "Poner claridad entre tantas ideas",
      },
      {
        value: "mostrar_caminos",
        label: "Entender caminos que todavía no estoy considerando",
      },
      {
        value: "decidir_entre_opciones",
        label: "Aceptar cuál de las opciones realmente puedo sostener",
      },
    ],
  } satisfies Question<NeedFromCouncil>,
  {
    id: "fearedLoss",
    title:
      "Si esta decisión sale mal, ¿qué haría que realmente se sintiera como un error?",
    options: [
      {
        value: "perder_tiempo",
        label: "Darme cuenta de que perdí demasiado tiempo",
      },
      {
        value: "arrepentirme",
        label: "Sentir que me traicioné a mí mismo/a",
      },
      {
        value: "decepcionar",
        label: "Que afecte a alguien importante para mí",
      },
      {
        value: "perder_dinero",
        label: "Perder estabilidad, dinero o tranquilidad",
      },
      {
        value: "duda_si_debia_intentar",
        label:
          "Quedarme pensando “¿y si sí debía haberlo intentado?”",
      },
    ],
  } satisfies Question<FearedLoss>,
  {
    id: "ageRange",
    title: "¿En qué rango de edad te encuentras?",
    options: [
      { value: "under_18", label: "Menor de 18 años" },
      { value: "18_24", label: "18 – 24 años" },
      { value: "25_34", label: "25 – 34 años" },
      { value: "35_44", label: "35 – 44 años" },
      { value: "45_54", label: "45 – 54 años" },
      { value: "55_64", label: "55 – 64 años" },
      { value: "65_plus", label: "65 años o más" },
      { value: "prefer_not_say", label: "Prefiero no decir" },
    ],
  } satisfies Question<AgeRange>,
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
    `  ageRange: ${ctx.ageRange}`,
    "</user_context>",
  ].join("\n");
}
