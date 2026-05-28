import "server-only";

import { getSupabaseServiceRoleKey, requireSupabaseConfig } from "@/lib/db/supabase";

interface CountResponse {
  id: string;
}

export interface ConversationRow {
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

export async function countRows(
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

export async function countActiveChatsForUser(userId: string): Promise<number> {
  return countRows("conversations", [
    ["user_id", userId],
    ["status", "active"],
  ]);
}

export async function countUserMessagesInConversation(
  conversationId: string,
): Promise<number> {
  return countRows("messages", [
    ["conversation_id", conversationId],
    ["role", "user"],
  ]);
}

export async function fetchConversationForUser(
  userId: string,
  conversationId: string,
): Promise<ConversationRow | null> {
  const url = restUrl("conversations");
  url.searchParams.set("select", "id,status");
  url.searchParams.set("id", `eq.${conversationId}`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, { headers: restHeaders(), cache: "no-store" });
  if (!response.ok) {
    throw new Error("FAILED_TO_FETCH_CONVERSATION");
  }

  const rows = (await response.json().catch(() => [])) as ConversationRow[];
  return rows[0] ?? null;
}
