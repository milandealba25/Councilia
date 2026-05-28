import type { PlanId } from "@/lib/billing/plans";

export interface PlanLimitPayload {
  code: string;
  message: string;
  plan?: string;
  limit?: number;
  used?: number;
}

export interface PlanLimitModalCopy {
  title: string;
  description: string;
  hint?: string;
}

function planLabel(plan?: string): string {
  if (plan === "pro") return "Pro";
  if (plan === "plus") return "Plus";
  return "Free";
}

export function buildPlanLimitModalCopy(
  payload: PlanLimitPayload,
): PlanLimitModalCopy {
  const label = planLabel(payload.plan);

  switch (payload.code) {
    case "ACTIVE_CHAT_LIMIT_REACHED": {
      const limit = payload.limit ?? 1;
      const chatWord = limit === 1 ? "chat activo" : "chats activos";
      return {
        title: `Llegaste al límite de tu plan ${label}`,
        description: `Tu plan actual permite ${limit} ${chatWord}.`,
        hint:
          payload.plan === "free"
            ? "Actualiza a Plus para crear hasta 10 chats o a Pro para uso ilimitado."
            : "Actualiza a Pro para chats simultáneos sin límite.",
      };
    }
    case "MESSAGE_LIMIT_REACHED": {
      const limit = payload.limit ?? 5;
      return {
        title: `Llegaste al límite de tu plan ${label}`,
        description: `Tu plan actual permite ${limit} mensajes por chat.`,
        hint:
          payload.plan === "free"
            ? "Actualiza a Plus para hasta 20 mensajes por chat o a Pro para uso ilimitado."
            : "Actualiza a Pro para mensajes por chat sin límite.",
      };
    }
    case "VOICE_NOT_AVAILABLE":
      return {
        title: "Voz disponible en Plus y Pro",
        description:
          payload.message ||
          "La dictación por voz no está incluida en el plan Free.",
        hint: "Actualiza tu plan para dictar mensajes con el micrófono.",
      };
    default:
      return {
        title: "Límite de tu plan alcanzado",
        description: payload.message || "No pudimos completar esta acción.",
        hint: "Revisa los planes disponibles para ampliar tus límites.",
      };
  }
}

export function formatUsageRatio(
  used: number,
  limit: number | null,
): string | null {
  if (limit === null) return null;
  return `${used} / ${limit}`;
}

export function shouldShowUsageCounters(plan: PlanId): boolean {
  return plan === "free" || plan === "plus";
}
