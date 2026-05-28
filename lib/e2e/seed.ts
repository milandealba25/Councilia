import "server-only";

import {
  getSupabaseServiceRoleKey,
  requireSupabaseConfig,
} from "@/lib/db/supabase";
import { SURVEY_VERSION } from "@/lib/survey/survey.v1";
import type { E2eScenario } from "@/lib/e2e/config";

const E2E_USER_CONTEXT = {
  surveyVersion: SURVEY_VERSION,
  decisionType: "vida",
  ageRange: "25_34",
  urgency: "explorando",
  needFromCouncil: "estructurar",
  fearedLoss: "perder_tiempo",
} as const;

export interface E2eSeedResult {
  userId: string;
  scenario: E2eScenario;
  activeConversationId: string | null;
  activeChats: number;
  userMessagesInActiveChat: number;
}

interface UserRow {
  id: string;
  email: string;
}

interface CouncilRow {
  id: string;
}

function restHeaders(): Record<string, string> {
  const serviceRole = getSupabaseServiceRoleKey();
  if (!serviceRole) {
    throw new Error("[e2e] Falta SUPABASE_SERVICE_ROLE_KEY.");
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

async function fetchUserByEmail(email: string): Promise<UserRow> {
  const url = restUrl("users");
  url.searchParams.set("select", "id,email");
  url.searchParams.set("email", `eq.${email}`);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, { headers: restHeaders(), cache: "no-store" });
  if (!response.ok) {
    throw new Error(`[e2e] No se pudo leer users (${response.status}).`);
  }
  const rows = (await response.json()) as UserRow[];
  if (!rows[0]?.id) {
    throw new Error(
      `[e2e] No existe public.users para ${email}. Crea el usuario con login/registro primero.`,
    );
  }
  return rows[0];
}

async function patchUser(
  userId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const url = restUrl("users");
  url.searchParams.set("id", `eq.${userId}`);
  const response = await fetch(url, {
    method: "PATCH",
    headers: { ...restHeaders(), prefer: "return=minimal" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`[e2e] No se pudo actualizar users (${response.status}).`);
  }
}

async function ensureCouncil(userId: string): Promise<string> {
  const listUrl = restUrl("councils");
  listUrl.searchParams.set("select", "id");
  listUrl.searchParams.set("user_id", `eq.${userId}`);
  listUrl.searchParams.set("order", "created_at.desc");
  listUrl.searchParams.set("limit", "1");

  const listResponse = await fetch(listUrl, {
    headers: restHeaders(),
    cache: "no-store",
  });
  if (!listResponse.ok) {
    throw new Error(`[e2e] No se pudo listar councils (${listResponse.status}).`);
  }
  const existing = (await listResponse.json()) as CouncilRow[];
  if (existing[0]?.id) return existing[0].id;

  const createResponse = await fetch(restUrl("councils"), {
    method: "POST",
    headers: { ...restHeaders(), prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId,
      user_context: E2E_USER_CONTEXT,
      survey_version: SURVEY_VERSION,
      name: "E2E Council",
    }),
  });
  if (!createResponse.ok) {
    throw new Error(`[e2e] No se pudo crear council (${createResponse.status}).`);
  }
  const created = (await createResponse.json()) as CouncilRow[];
  return created[0].id;
}

async function deleteConversationsForUser(userId: string): Promise<void> {
  const url = restUrl("conversations");
  url.searchParams.set("user_id", `eq.${userId}`);
  const response = await fetch(url, {
    method: "DELETE",
    headers: restHeaders(),
  });
  if (!response.ok) {
    throw new Error(
      `[e2e] No se pudieron limpiar conversations (${response.status}).`,
    );
  }
}

async function createActiveConversation(
  userId: string,
  councilId: string,
  title: string,
): Promise<string> {
  const response = await fetch(restUrl("conversations"), {
    method: "POST",
    headers: { ...restHeaders(), prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId,
      council_id: councilId,
      title,
      status: "active",
      summary: "",
      key_facts: [],
    }),
  });
  if (!response.ok) {
    throw new Error(
      `[e2e] No se pudo crear conversation (${response.status}).`,
    );
  }
  const rows = (await response.json()) as Array<{ id: string }>;
  return rows[0].id;
}

async function insertUserMessages(
  conversationId: string,
  count: number,
): Promise<void> {
  if (count <= 0) return;
  const rows = Array.from({ length: count }, (_, index) => ({
    conversation_id: conversationId,
    role: "user",
    phase: "user_input",
    content: `Mensaje E2E ${index + 1}`,
    content_json: { turn_id: `e2e-turn-${index + 1}` },
  }));
  const response = await fetch(restUrl("messages"), {
    method: "POST",
    headers: restHeaders(),
    body: JSON.stringify(rows),
  });
  if (!response.ok) {
    throw new Error(`[e2e] No se pudieron crear messages (${response.status}).`);
  }
}

export async function runE2eSeed(
  scenario: E2eScenario,
  email: string,
): Promise<E2eSeedResult> {
  const user = await fetchUserByEmail(email);
  const councilId = await ensureCouncil(user.id);
  await deleteConversationsForUser(user.id);

  let plan: "free" | "plus" | "pro" = "free";
  let activeChats = 0;
  let userMessagesInActiveChat = 0;
  let activeConversationId: string | null = null;

  switch (scenario) {
    case "free_second_chat":
      plan = "free";
      activeChats = 1;
      await patchUser(user.id, {
        plan: "free",
        subscription_status: null,
        onboarding_completed_at: new Date().toISOString(),
      });
      activeConversationId = await createActiveConversation(
        user.id,
        councilId,
        "Chat E2E Free 1",
      );
      break;
    case "plus_eleventh_chat":
      plan = "plus";
      activeChats = 10;
      await patchUser(user.id, {
        plan: "plus",
        subscription_status: "active",
        onboarding_completed_at: new Date().toISOString(),
      });
      for (let i = 0; i < 10; i += 1) {
        await createActiveConversation(
          user.id,
          councilId,
          `Chat E2E Plus ${i + 1}`,
        );
      }
      activeConversationId = null;
      break;
    case "free_sixth_message":
      plan = "free";
      activeChats = 1;
      userMessagesInActiveChat = 5;
      await patchUser(user.id, {
        plan: "free",
        subscription_status: null,
        onboarding_completed_at: new Date().toISOString(),
      });
      activeConversationId = await createActiveConversation(
        user.id,
        councilId,
        "Chat E2E Free mensajes",
      );
      await insertUserMessages(activeConversationId, 5);
      break;
  }

  return {
    userId: user.id,
    scenario,
    activeConversationId,
    activeChats,
    userMessagesInActiveChat,
  };
}
