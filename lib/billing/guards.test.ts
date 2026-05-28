import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserEntitlements } from "@/lib/billing/entitlements";
import type { PlanId } from "@/lib/billing/plans";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db/supabase", () => ({
  getSupabaseServiceRoleKey: vi.fn(() => "service-role-key"),
  requireSupabaseConfig: vi.fn(() => ({
    url: "https://example.supabase.co",
    anonKey: "anon",
  })),
}));

vi.mock("@/lib/billing/entitlements", () => ({
  getUserEntitlements: vi.fn(),
}));

describe("billing/guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("free con 0 chats activos => permitido", async () => {
    const { canCreateChat } = await import("@/lib/billing/guards");
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    vi.mocked(getUserEntitlements).mockResolvedValue(mockEntitlements("free"));
    vi.mocked(fetch).mockResolvedValue(countResponse(0));

    const result = await canCreateChat("user_1");
    expect(result).toMatchObject({ allowed: true, plan: "free", limit: 1, used: 0 });
  });

  it("free con 1 chat activo => bloqueado", async () => {
    const { canCreateChat } = await import("@/lib/billing/guards");
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    vi.mocked(getUserEntitlements).mockResolvedValue(mockEntitlements("free"));
    vi.mocked(fetch).mockResolvedValue(countResponse(1));

    const result = await canCreateChat("user_1");
    expect(result).toMatchObject({
      allowed: false,
      code: "ACTIVE_CHAT_LIMIT_REACHED",
      plan: "free",
      limit: 1,
      used: 1,
    });
  });

  it("free con 4 mensajes user => permitido", async () => {
    const { canSendMessage } = await import("@/lib/billing/guards");
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    vi.mocked(getUserEntitlements).mockResolvedValue(mockEntitlements("free"));
    vi.mocked(fetch)
      .mockResolvedValueOnce(conversationResponse("active"))
      .mockResolvedValueOnce(countResponse(4));

    const result = await canSendMessage("user_1", "chat_1");
    expect(result).toMatchObject({ allowed: true, plan: "free", limit: 5, used: 4 });
  });

  it("free con 5 mensajes user => bloqueado", async () => {
    const { canSendMessage } = await import("@/lib/billing/guards");
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    vi.mocked(getUserEntitlements).mockResolvedValue(mockEntitlements("free"));
    vi.mocked(fetch)
      .mockResolvedValueOnce(conversationResponse("active"))
      .mockResolvedValueOnce(countResponse(5));

    const result = await canSendMessage("user_1", "chat_1");
    expect(result).toMatchObject({
      allowed: false,
      code: "MESSAGE_LIMIT_REACHED",
      plan: "free",
      limit: 5,
      used: 5,
    });
  });

  it("plus con 9 chats => permitido", async () => {
    const { canCreateChat } = await import("@/lib/billing/guards");
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    vi.mocked(getUserEntitlements).mockResolvedValue(mockEntitlements("plus"));
    vi.mocked(fetch).mockResolvedValue(countResponse(9));

    const result = await canCreateChat("user_1");
    expect(result.allowed).toBe(true);
  });

  it("plus con 10 chats => bloqueado", async () => {
    const { canCreateChat } = await import("@/lib/billing/guards");
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    vi.mocked(getUserEntitlements).mockResolvedValue(mockEntitlements("plus"));
    vi.mocked(fetch).mockResolvedValue(countResponse(10));

    const result = await canCreateChat("user_1");
    expect(result).toMatchObject({
      allowed: false,
      code: "ACTIVE_CHAT_LIMIT_REACHED",
      plan: "plus",
      limit: 10,
      used: 10,
    });
  });

  it("pro con 100 chats => permitido (sin límite)", async () => {
    const { canCreateChat } = await import("@/lib/billing/guards");
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    vi.mocked(getUserEntitlements).mockResolvedValue(mockEntitlements("pro"));
    vi.mocked(fetch).mockResolvedValue(countResponse(100));

    const result = await canCreateChat("user_1");
    expect(result).toMatchObject({ allowed: true, plan: "pro", used: 100 });
    expect(result.limit).toBeUndefined();
  });

  it("voz bloqueada en free y habilitada en plus", async () => {
    const { canUseVoice } = await import("@/lib/billing/guards");
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    vi.mocked(getUserEntitlements).mockResolvedValueOnce(mockEntitlements("free"));
    const denied = await canUseVoice("user_1");
    expect(denied).toMatchObject({
      allowed: false,
      code: "VOICE_NOT_AVAILABLE",
      plan: "free",
    });

    vi.mocked(getUserEntitlements).mockResolvedValueOnce(mockEntitlements("plus"));
    const allowed = await canUseVoice("user_1");
    expect(allowed).toMatchObject({ allowed: true, plan: "plus" });
  });
});

function mockEntitlements(plan: PlanId): UserEntitlements {
  const maxActiveChats = plan === "free" ? 1 : plan === "plus" ? 10 : null;
  const maxMessagesPerChat = plan === "free" ? 5 : plan === "plus" ? 20 : null;
  const llmModel = plan === "free" ? "gemini-flash" : "gpt-4o-mini";
  const synthesisModel =
    plan === "free" ? "gemini-flash" : plan === "plus" ? "gpt-4o-mini" : "gpt-4o";
  return {
    userId: "user_1",
    storedPlan: plan,
    effectivePlan: plan,
    subscriptionStatus: "active",
    limits: {
      maxActiveChats,
      maxMessagesPerChat,
      historySize: plan === "free" ? 1 : plan === "plus" ? 10 : null,
      llmModel,
      synthesisModel,
      voiceEnabled: plan !== "free",
      synthesisEnabled: true,
      exportEnabled: plan === "pro",
      prioritySupport: plan === "pro",
    },
  };
}

function countResponse(total: number): Response {
  return new Response("[]", {
    status: 200,
    headers: {
      "content-range": `0-0/${total}`,
    },
  });
}

function conversationResponse(status: string): Response {
  return new Response(JSON.stringify([{ id: "chat_1", status }]), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}
