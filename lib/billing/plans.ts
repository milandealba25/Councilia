/**
 * Catálogo de planes COUNCILia.
 *
 * Fuente única de verdad consumida por:
 *  - UI (PricingCard, BillingPanel) — para mostrar features y precios.
 *  - API de checkout/webhook — para resolver `lookup_key` ↔ plan.
 *  - Backend (lib/billing/repository) — para mapear el resultado de Stripe a un
 *    plan de la app y aplicar los límites correspondientes.
 *
 * Los precios reales viven en Stripe; aquí solo guardamos los lookup_keys.
 */

export type PlanId = "free" | "plus" | "pro";
export type BillingCycle = "monthly" | "annual";

export interface PlanLimits {
  /** Chats activos simultáneos. `null` = ilimitado. */
  maxActiveChats: number | null;
  /** Mensajes por chat. `null` = ilimitado. */
  maxMessagesPerChat: number | null;
  /** Cuántos chats se conservan en el historial. `null` = ilimitado. */
  historySize: number | null;
  /** Modelo LLM para posturas / réplica. */
  llmModel: "gemini-flash" | "gpt-4o-mini";
  /** Modelo LLM para la síntesis. */
  synthesisModel: "gemini-flash" | "gpt-4o-mini" | "gpt-4o";
  voiceEnabled: boolean;
  synthesisEnabled: boolean;
  exportEnabled: boolean;
  prioritySupport: boolean;
}

export interface PlanCopy {
  /** Nombre comercial. */
  name: string;
  /** Tagline corto debajo del nombre. */
  tagline: string;
  /** Descripción larga. */
  description: string;
  /** Lista de features mostradas en la pricing card. */
  features: string[];
  /** Etiqueta de relevancia (ej. "Recomendado"). */
  badge?: string;
}

export interface PlanPricing {
  /** Solo presente en planes pagos. */
  monthly?: {
    amountMxn: number;
    lookupKey: string;
  };
  annual?: {
    amountMxn: number;
    lookupKey: string;
    /** Descuento vs 12 × mensual (porcentaje entero). */
    discountPct: number;
  };
}

export interface PlanDefinition {
  id: PlanId;
  tier: number;
  paid: boolean;
  copy: PlanCopy;
  limits: PlanLimits;
  pricing: PlanPricing;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    tier: 0,
    paid: false,
    copy: {
      name: "Free",
      tagline: "Para probar el council",
      description:
        "Acceso al council con un chat activo, ideal para conocer cómo se siente la dinámica.",
      features: [
        "1 chat activo simultáneo",
        "5 mensajes por chat",
        "Solo el último chat en historial",
        "Modelo Gemini Flash",
      ],
    },
    limits: {
      maxActiveChats: 1,
      maxMessagesPerChat: 5,
      historySize: 1,
      llmModel: "gemini-flash",
      synthesisModel: "gemini-flash",
      voiceEnabled: false,
      synthesisEnabled: true,
      exportEnabled: false,
      prioritySupport: false,
    },
    pricing: {},
  },
  plus: {
    id: "plus",
    tier: 1,
    paid: true,
    copy: {
      name: "Plus",
      tagline: "Para deliberar de forma continua",
      description:
        "Council completo con voz, mejor modelo y suficiente historial para volver a una conversación.",
      features: [
        "10 chats simultáneos",
        "20 mensajes por chat",
        "Historial de los últimos 10 chats",
        "Modelo GPT-4o-mini",
        "Voz incluida (TTS nativo Google/OpenAI)",
      ],
    },
    limits: {
      maxActiveChats: 10,
      maxMessagesPerChat: 20,
      historySize: 10,
      llmModel: "gpt-4o-mini",
      synthesisModel: "gpt-4o-mini",
      voiceEnabled: true,
      synthesisEnabled: true,
      exportEnabled: false,
      prioritySupport: false,
    },
    pricing: {
      monthly: {
        amountMxn: 79,
        lookupKey: "councilia_plus_monthly_mxn",
      },
      annual: {
        amountMxn: 790,
        lookupKey: "councilia_plus_annual_mxn",
        discountPct: 17,
      },
    },
  },
  pro: {
    id: "pro",
    tier: 2,
    paid: true,
    copy: {
      name: "Pro",
      tagline: "Para usar el council como herramienta diaria",
      description:
        "Sin límites de chats, historial completo, mejor síntesis y exportación de conversaciones.",
      features: [
        "Chats simultáneos sin límite",
        "Mensajes por chat sin límite",
        "Historial completo",
        "GPT-4o-mini + síntesis con GPT-4o",
        "Voz incluida (TTS nativo Google/OpenAI)",
        "Exportar chats a PDF y Markdown",
        "Prioridad en soporte por correo",
      ],
      badge: "Recomendado",
    },
    limits: {
      maxActiveChats: null,
      maxMessagesPerChat: null,
      historySize: null,
      llmModel: "gpt-4o-mini",
      synthesisModel: "gpt-4o",
      voiceEnabled: true,
      synthesisEnabled: true,
      exportEnabled: true,
      prioritySupport: true,
    },
    pricing: {
      monthly: {
        amountMxn: 199,
        lookupKey: "councilia_pro_monthly_mxn",
      },
      annual: {
        amountMxn: 1990,
        lookupKey: "councilia_pro_annual_mxn",
        discountPct: 17,
      },
    },
  },
};

export const PAID_PLAN_IDS: readonly PlanId[] = ["plus", "pro"];

export function getPlan(id: PlanId): PlanDefinition {
  return PLANS[id];
}

export function findPlanByLookupKey(
  lookupKey: string,
): { plan: PlanDefinition; cycle: BillingCycle } | null {
  for (const plan of Object.values(PLANS)) {
    if (plan.pricing.monthly?.lookupKey === lookupKey) {
      return { plan, cycle: "monthly" };
    }
    if (plan.pricing.annual?.lookupKey === lookupKey) {
      return { plan, cycle: "annual" };
    }
  }
  return null;
}

export function resolveLookupKey(
  planId: PlanId,
  cycle: BillingCycle,
): string | null {
  const plan = PLANS[planId];
  if (cycle === "monthly") return plan.pricing.monthly?.lookupKey ?? null;
  return plan.pricing.annual?.lookupKey ?? null;
}

export function isPaidPlan(planId: PlanId): boolean {
  return PLANS[planId].paid;
}

export function isValidPlanId(value: unknown): value is PlanId {
  return value === "free" || value === "plus" || value === "pro";
}

export function isValidBillingCycle(value: unknown): value is BillingCycle {
  return value === "monthly" || value === "annual";
}
