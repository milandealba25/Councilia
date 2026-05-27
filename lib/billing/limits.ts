import {
  PLANS,
  type PlanDefinition,
  type PlanId,
} from "@/lib/billing/plans";

/**
 * Resultado canónico para verificación de límites.
 *
 *  - `allowed`: si la acción se puede ejecutar
 *  - `reason`:  por qué no, cuando aplica
 *  - `limit`:   tope numérico del plan (`null` = ilimitado, `undefined` = no aplica)
 */
export interface LimitCheck {
  allowed: boolean;
  reason?:
    | "plan_chat_limit"
    | "plan_message_limit"
    | "feature_disabled";
  limit?: number | null;
}

export function planLimits(plan: PlanId): PlanDefinition["limits"] {
  return PLANS[plan].limits;
}

/**
 * Devuelve true cuando `value` está debajo de `limit` (con `null` = ilimitado).
 * Hacerlo en un helper evita repetir la lógica de "null = sin tope" por toda
 * la app.
 */
function withinNumericLimit(value: number, limit: number | null): boolean {
  if (limit === null) return true;
  return value < limit;
}

export function canCreateActiveChat(
  plan: PlanId,
  currentActiveChats: number,
): LimitCheck {
  const limit = planLimits(plan).maxActiveChats;
  if (withinNumericLimit(currentActiveChats, limit)) {
    return { allowed: true, limit };
  }
  return { allowed: false, reason: "plan_chat_limit", limit };
}

export function canSendMessageInChat(
  plan: PlanId,
  currentMessagesInChat: number,
): LimitCheck {
  const limit = planLimits(plan).maxMessagesPerChat;
  if (withinNumericLimit(currentMessagesInChat, limit)) {
    return { allowed: true, limit };
  }
  return { allowed: false, reason: "plan_message_limit", limit };
}

export function canUseVoice(plan: PlanId): LimitCheck {
  return planLimits(plan).voiceEnabled
    ? { allowed: true }
    : { allowed: false, reason: "feature_disabled" };
}

export function canExportChats(plan: PlanId): LimitCheck {
  return planLimits(plan).exportEnabled
    ? { allowed: true }
    : { allowed: false, reason: "feature_disabled" };
}

/**
 * Limita cuántos chats viejos puede mostrar el historial. Útil al construir
 * el listado en `/session` o en el menú lateral.
 */
export function clampHistorySize(plan: PlanId, total: number): number {
  const limit = planLimits(plan).historySize;
  if (limit === null) return total;
  return Math.min(total, limit);
}

export function resolveLlmModel(plan: PlanId): PlanDefinition["limits"]["llmModel"] {
  return planLimits(plan).llmModel;
}

export function resolveSynthesisModel(
  plan: PlanId,
): PlanDefinition["limits"]["synthesisModel"] {
  return planLimits(plan).synthesisModel;
}
