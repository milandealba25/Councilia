import { expect, test } from "@playwright/test";

import { e2eConfigured, openSessionAuthenticated } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeEach(() => {
  test.skip(
    !e2eConfigured(),
    "Configura E2E_TEST_MODE, E2E_TEST_SECRET, E2E_TEST_EMAIL y E2E_TEST_PASSWORD en .env.local.",
  );
});

async function submitFirstMessageInDraft(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.getByRole("button", { name: /nuevo chat/i }).click();
  const input = page.locator("#user-input");
  await expect(input).toBeVisible({ timeout: 30_000 });
  await input.fill("Mensaje E2E para disparar la creación del chat.");
  await page.getByRole("button", { name: /^enviar$/i }).click();
}

test("Free: el segundo chat muestra modal de límite", async ({ page, request }) => {
  await openSessionAuthenticated(page, request, "free_second_chat");

  const createChatResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/chats") &&
      response.request().method() === "POST",
  );
  await submitFirstMessageInDraft(page);
  expect((await createChatResponse).status()).toBe(403);

  const dialog = page.getByRole("dialog", { name: /límite de tu plan/i });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText(/tu plan actual permite 1 chat activo/i),
  ).toBeVisible();
  await expect(dialog.getByRole("link", { name: /ver planes/i })).toBeVisible();
});

test("Plus: el chat 11 muestra modal de límite", async ({ page, request }) => {
  await openSessionAuthenticated(page, request, "plus_eleventh_chat");

  const createChatResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/chats") &&
      response.request().method() === "POST",
  );
  await submitFirstMessageInDraft(page);
  expect((await createChatResponse).status()).toBe(403);

  const dialog = page.getByRole("dialog", { name: /límite de tu plan/i });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText(/tu plan actual permite 10 chats activos/i),
  ).toBeVisible();
});

test("Free: el sexto mensaje muestra modal de límite", async ({ page, request }) => {
  await openSessionAuthenticated(page, request, "free_sixth_message");

  const input = page.locator("#user-input");
  await expect(input).toBeVisible({ timeout: 30_000 });
  await input.fill("Este sería mi sexto mensaje en el chat E2E.");

  const turnResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/turns") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /^enviar$/i }).click();
  expect((await turnResponse).status()).toBe(403);

  const dialog = page.getByRole("dialog", { name: /límite de tu plan/i });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await expect(
    dialog.getByText(/tu plan actual permite 5 mensajes por chat/i),
  ).toBeVisible();
});
