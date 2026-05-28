import "server-only";

import { getUserEntitlements } from "@/lib/billing/entitlements";
import { getSupabaseServiceRoleKey, requireSupabaseConfig } from "@/lib/db/supabase";

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
  const used = await countRows("conversations", [
    ["user_id", userId],
    ["status", "active"],
  ]);
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
  const conversation = await fetchConversationOwnership(userId, conversationId);

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

  const used = await countRows("messages", [
    ["conversation_id", conversationId],
    ["role", "user"],
  ]);
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

interface CountResponse {
  count: number | null;
}

interface ConversationResponse {
  id: string;
  status: string;
}

function restHeaders(): Record<string, string> {
  const serviceRole = getSupabaseServiceRoleKey();
  if (!serviceRole) {
    throw new Error(
      "[billing] Falta SUPABASE_SERVICE_ROLE_KEY para validar límites de plan.",
    );
  }
  return {
    apikey: serviceRole,
    authorization: `Bearer ${serviceRole}`,
    "content-type": "application/json",
  };
}

function restUrl(table: string): URL {
  const { url } = requireSupabaseConfig();
  return new URL(`/rest/v1/${table}`, url);
}

async function countRows(
  table: string,
  filters: Array<[column: string, value: string]>,
): Promise<number> {
  const url = restUrl(table);
  url.searchParams.set("select", "id");
  for (const [column, value] of filters) {
    url.searchParams.set(column, `eq.${value}`);
  }

  const response = await fetch(url, {
    headers: { ...restHeaders(), prefer: "count=exact", range: "0-0" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`FAILED_TO_COUNT_${table.toUpperCase()}`);
  }

  const range = response.headers.get("content-range");
  if (range) {
    const total = Number.parseInt(range.split("/")[1] ?? "0", 10);
    if (Number.isFinite(total)) return total;
  }

  const rows = (await response.json().catch(() => [])) as CountResponse[];
  return rows.length;
}

async function fetchConversationOwnership(
  userId: string,
  conversationId: string,
): Promise<ConversationResponse | null> {
  const url = restUrl("conversations");
  url.searchParams.set("select", "id,status");
  url.searchParams.set("id", `eq.${conversationId}`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, { headers: restHeaders(), cache: "no-store" });
  if (!response.ok) {
    throw new Error("FAILED_TO_FETCH_CONVERSATION");
  }

  const rows = (await response.json().catch(() => [])) as ConversationResponse[];
  return rows[0] ?? null;
}
