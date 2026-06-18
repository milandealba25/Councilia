/**
 * Crea o confirma el usuario E2E en Supabase Auth (email_confirm: true).
 * Uso: node scripts/ensure-e2e-user.mjs
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local") });

const url = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

if (!url || !serviceRole || !email || !password) {
  console.error(
    "[e2e] Faltan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, E2E_TEST_EMAIL o E2E_TEST_PASSWORD.",
  );
  process.exit(1);
}

const headers = {
  apikey: serviceRole,
  authorization: `Bearer ${serviceRole}`,
  "content-type": "application/json",
};

const anonKey = process.env.SUPABASE_ANON_KEY;

async function resolveUserFromPasswordLogin() {
  if (!anonKey) return null;
  const loginResponse = await fetch(
    new URL("/auth/v1/token?grant_type=password", url),
    {
      method: "POST",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    },
  );
  if (!loginResponse.ok) return null;
  const login = await loginResponse.json();
  if (!login.access_token) return null;

  const userResponse = await fetch(new URL("/auth/v1/user", url), {
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${login.access_token}`,
    },
  });
  if (!userResponse.ok) return null;
  const user = await userResponse.json();
  return user?.id ? user : null;
}

async function createUser() {
  const response = await fetch(new URL("/auth/v1/admin/users", url), {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "E2E Plan Limits", display_name: "E2E Plan Limits" },
    }),
  });
  if (response.status === 422 || response.status === 409) {
    return resolveUserFromPasswordLogin();
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Create user failed (${response.status}): ${text}`);
  }
  return response.json();
}

async function syncPublicUser(userId) {
  const restUrl = new URL("/rest/v1/users", url);
  const response = await fetch(restUrl, {
    method: "POST",
    headers: { ...headers, prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      id: userId,
      email,
      display_name: "E2E Plan Limits",
      plan: "free",
      onboarding_completed_at: new Date().toISOString(),
    }),
  });
  if (!response.ok && response.status !== 409) {
    const patchUrl = new URL("/rest/v1/users", url);
    patchUrl.searchParams.set("id", `eq.${userId}`);
    const patch = await fetch(patchUrl, {
      method: "PATCH",
      headers: { ...headers, prefer: "return=minimal" },
      body: JSON.stringify({
        email,
        display_name: "E2E Plan Limits",
        onboarding_completed_at: new Date().toISOString(),
      }),
    });
    if (!patch.ok) {
      const text = await patch.text();
      throw new Error(`Sync public.users failed (${patch.status}): ${text}`);
    }
  }
}

const user = (await resolveUserFromPasswordLogin()) ?? (await createUser());
const userId = user?.id;
if (!userId) {
  console.error("[e2e] No se pudo obtener user id.");
  process.exit(1);
}

await syncPublicUser(userId);
console.log(`[e2e] Usuario listo: ${email} (${userId})`);
