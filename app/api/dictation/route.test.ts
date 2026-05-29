import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("server-only", () => ({}));

const auth = {
  accessToken: "token",
  user: { id: "user_1", email: "user@example.com" },
};

vi.mock("@/lib/auth/serverSession", () => ({
  authenticateRequest: vi.fn(),
  isAuthError: (value: unknown) => value instanceof NextResponse,
}));

vi.mock("@/lib/billing/guards", () => ({
  canUseVoice: vi.fn(),
}));

function postDictation() {
  const form = new FormData();
  form.append("audio", new File(["audio-bytes"], "test.webm", { type: "audio/webm" }));
  return new Request("http://localhost/api/dictation", {
    method: "POST",
    headers: { authorization: "Bearer token" },
    body: form,
  });
}

describe("POST /api/dictation — voz por plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Free → 403 VOICE_NOT_AVAILABLE (sin transcribir)", async () => {
    const { authenticateRequest } = await import("@/lib/auth/serverSession");
    const { canUseVoice } = await import("@/lib/billing/guards");
    const { POST } = await import("./route");

    vi.mocked(authenticateRequest).mockResolvedValue(auth);
    vi.mocked(canUseVoice).mockResolvedValue({
      allowed: false,
      code: "VOICE_NOT_AVAILABLE",
      message: "La voz está disponible en Plus y Pro.",
      plan: "free",
    });

    const response = await POST(postDictation() as never);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("VOICE_NOT_AVAILABLE");
    expect(body.plan).toBe("free");
  });

  it.each(["plus", "pro"] as const)(
    "%s → guard permite voz (pasa el check de plan)",
    async (plan) => {
      const { authenticateRequest } = await import("@/lib/auth/serverSession");
      const { canUseVoice } = await import("@/lib/billing/guards");
      const { POST } = await import("./route");

      vi.mocked(authenticateRequest).mockResolvedValue(auth);
      vi.mocked(canUseVoice).mockResolvedValue({
        allowed: true,
        plan,
      });

      const response = await POST(postDictation() as never);
      expect(canUseVoice).toHaveBeenCalledWith("user_1");
      expect(response.status).not.toBe(403);
    },
  );

  it("Plus degradado (effective free) → 403", async () => {
    const { authenticateRequest } = await import("@/lib/auth/serverSession");
    const { canUseVoice } = await import("@/lib/billing/guards");
    const { POST } = await import("./route");

    vi.mocked(authenticateRequest).mockResolvedValue(auth);
    vi.mocked(canUseVoice).mockResolvedValue({
      allowed: false,
      code: "VOICE_NOT_AVAILABLE",
      message: "La voz está disponible en Plus y Pro.",
      plan: "free",
    });

    const response = await POST(postDictation() as never);
    expect(response.status).toBe(403);
    expect((await response.json()).plan).toBe("free");
  });
});
