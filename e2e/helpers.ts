import type { APIRequestContext, Page } from "@playwright/test";

import type { AuthSession } from "@/lib/auth/client";
import type { E2eScenario } from "@/lib/e2e/config";

const AUTH_KEY = "councilia.authSession.v1";
const ACTIVE_CHAT_KEY = "councilia.activeChatId.v1";
const COOKIE_PREFS_KEY = "councilia.cookies.v1";
const USER_CONTEXT_KEY = "councilia.userContext.v1";

const E2E_USER_CONTEXT = {
  surveyVersion: "v1",
  decisionType: "vida",
  ageRange: "25_34",
  urgency: "explorando",
  needFromCouncil: "estructurar",
  fearedLoss: "perder_tiempo",
} as const;

const COOKIE_PREFS = {
  version: 1,
  decidedAt: new Date().toISOString(),
  necessary: true,
  functional: false,
  analytics: false,
};

export function e2eConfigured(): boolean {
  return Boolean(
    process.env.E2E_TEST_MODE === "1" &&
      process.env.E2E_TEST_SECRET &&
      process.env.E2E_TEST_EMAIL &&
      process.env.E2E_TEST_PASSWORD,
  );
}

export async function seedScenario(
  request: APIRequestContext,
  scenario: E2eScenario,
): Promise<{
  activeConversationId: string | null;
}> {
  const response = await request.post("/api/e2e/seed", {
    headers: {
      "x-e2e-secret": process.env.E2E_TEST_SECRET!,
      "content-type": "application/json",
    },
    data: { scenario },
  });
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Seed E2E falló (${response.status()}): ${body}`);
  }
  const payload = (await response.json()) as {
    seed?: { activeConversationId?: string | null };
  };
  return {
    activeConversationId: payload.seed?.activeConversationId ?? null,
  };
}

export async function loginTestUser(
  request: APIRequestContext,
): Promise<AuthSession> {
  const response = await request.post("/api/auth/password", {
    data: {
      email: process.env.E2E_TEST_EMAIL,
      password: process.env.E2E_TEST_PASSWORD,
      mode: "login",
    },
  });
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Login E2E falló (${response.status()}): ${body}`);
  }
  const payload = (await response.json()) as { session?: AuthSession };
  if (!payload.session?.accessToken) {
    throw new Error("Login E2E no devolvió session.");
  }
  return payload.session;
}

export async function persistBrowserSession(
  page: Page,
  session: AuthSession,
  activeChatId: string | null,
): Promise<void> {
  await page.evaluate(
    ({
      authKey,
      activeKey,
      cookieKey,
      userContextKey,
      authSession,
      chatId,
      cookiePrefs,
      userContext,
    }) => {
      localStorage.setItem(authKey, JSON.stringify(authSession));
      localStorage.setItem(cookieKey, JSON.stringify(cookiePrefs));
      localStorage.setItem(userContextKey, JSON.stringify(userContext));
      sessionStorage.setItem(userContextKey, JSON.stringify(userContext));
      if (chatId) {
        localStorage.setItem(activeKey, chatId);
      } else {
        localStorage.removeItem(activeKey);
      }
    },
    {
      authKey: AUTH_KEY,
      activeKey: ACTIVE_CHAT_KEY,
      cookieKey: COOKIE_PREFS_KEY,
      userContextKey: USER_CONTEXT_KEY,
      authSession: session,
      chatId: activeChatId,
      cookiePrefs: COOKIE_PREFS,
      userContext: E2E_USER_CONTEXT,
    },
  );
}

export async function dismissCookieBannerIfVisible(page: Page): Promise<void> {
  const cookieDialog = page.getByRole("dialog", { name: /aviso de cookies/i });
  if (await cookieDialog.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /solo necesarias/i }).click();
  }
}

export async function waitForSessionReady(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: /nuevo chat/i })
    .waitFor({ state: "visible", timeout: 30_000 });
  await page
    .getByText(/cargando tus chats/i)
    .waitFor({ state: "hidden", timeout: 30_000 });
  await page
    .getByText(/preparando la sala/i)
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => undefined);
  await dismissCookieBannerIfVisible(page);
}

export async function openSessionAuthenticated(
  page: Page,
  request: APIRequestContext,
  scenario: E2eScenario,
): Promise<void> {
  const seed = await seedScenario(request, scenario);
  const session = await loginTestUser(request);

  await page.goto("/session", { waitUntil: "domcontentloaded" });
  await persistBrowserSession(page, session, seed.activeConversationId);
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForSessionReady(page);
}
