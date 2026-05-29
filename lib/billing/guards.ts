import "server-only";

import { getUserEntitlements } from "@/lib/billing/entitlements";
import {
  countActiveChatsForUser,
  countUserMessagesInConversation,
  fetchConversationForUser,
} from "@/lib/billing/queries";

export type GuardResult =
  | {
      allowed: true;
      plan: string;
      limit?: number;
      used?: number;
    }
  | {
      allowed: false;
      code: string;
      message: string;
      plan: string;
      limit?: number;
      used?: number;
    };

export async function canCreateChat(userId: string): Promise<GuardResult> {
  const entitlements = await getUserEntitlements(userId);
  const used = await countActiveChatsForUser(userId);
  const limit = entitlements.limits.maxActiveChats;

  if (limit !== null && used >= limit) {
    return {
      allowed: false,
      code: "ACTIVE_CHAT_LIMIT_REACHED",
      message: getChatLimitMessage(entitlements.effectivePlan, limit),
      plan: entitlements.effectivePlan,
      limit,
      used,
    };
  }

  return {
    allowed: true,
    plan: entitlements.effectivePlan,
    limit: limit ?? undefined,
    used,
  };
}

export async function canSendMessage(
  userId: string,
  conversationId: string,
): Promise<GuardResult> {
  const entitlements = await getUserEntitlements(userId);
  const conversation = await fetchConversationForUser(userId, conversationId);

  if (!conversation) {
    return {
      allowed: false,
      code: "CONVERSATION_NOT_FOUND",
      message: "No encontramos este chat o no pertenece a tu cuenta.",
      plan: entitlements.effectivePlan,
    };
  }

  if (conversation.status !== "active") {
    return {
      allowed: false,
      code: "CONVERSATION_NOT_ACTIVE",
      message: "Este chat ya no está activo.",
      plan: entitlements.effectivePlan,
    };
  }

  const used = await countUserMessagesInConversation(conversationId);
  const limit = entitlements.limits.maxMessagesPerChat;

  if (limit !== null && used >= limit) {
    return {
      allowed: false,
      code: "MESSAGE_LIMIT_REACHED",
      message: getMessageLimitMessage(entitlements.effectivePlan, limit),
      plan: entitlements.effectivePlan,
      limit,
      used,
    };
  }

  return {
    allowed: true,
    plan: entitlements.effectivePlan,
    limit: limit ?? undefined,
    used,
  };
}

export async function canUseVoice(userId: string): Promise<GuardResult> {
  const entitlements = await getUserEntitlements(userId);
  if (!entitlements.limits.voiceEnabled) {
    return {
      allowed: false,
      code: "VOICE_NOT_AVAILABLE",
      message: "La voz está disponible en Plus y Pro.",
      plan: entitlements.effectivePlan,
    };
  }
  return {
    allowed: true,
    plan: entitlements.effectivePlan,
  };
}

function getChatLimitMessage(plan: string, limit: number): string {
  if (plan === "free") {
    return `Tu plan Free permite ${limit} chat activo. Actualiza a Plus o Pro para crear más chats.`;
  }
  return `Llegaste al límite de ${limit} chats activos de tu plan.`;
}

function getMessageLimitMessage(plan: string, limit: number): string {
  if (plan === "free") {
    return `Tu plan Free permite ${limit} mensajes por chat. Actualiza a Plus o Pro para continuar.`;
  }
  return `Llegaste al límite de ${limit} mensajes por chat de tu plan.`;
}
