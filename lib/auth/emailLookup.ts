import "server-only";
import { getSupabaseServiceRoleKey } from "@/lib/db/supabase";

export async function checkEmailInUse(
  supabaseUrl: string,
  email: string,
): Promise<boolean> {
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!serviceRoleKey) {
    throw new Error("missing_service_role_key");
  }

  if (await checkPublicUserEmailInUse(supabaseUrl, email, serviceRoleKey)) {
    return true;
  }

  return checkAuthEmailInUse(supabaseUrl, email, serviceRoleKey);
}

async function checkPublicUserEmailInUse(
  supabaseUrl: string,
  email: string,
  serviceRoleKey: string,
): Promise<boolean> {
  const url = new URL("/rest/v1/users", supabaseUrl);
  url.searchParams.set("select", "id");
  url.searchParams.set("email", `eq.${email}`);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) return false;
  const rows = (await response.json().catch(() => [])) as unknown[];
  return rows.length > 0;
}

async function checkAuthEmailInUse(
  supabaseUrl: string,
  email: string,
  serviceRoleKey: string,
): Promise<boolean> {
  const url = new URL("/auth/v1/admin/users", supabaseUrl);
  url.searchParams.set("page", "1");
  url.searchParams.set("per_page", "200");

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) return false;
  const data = (await response.json().catch(() => null)) as
    | { users?: Array<{ email?: string }> }
    | Array<{ email?: string }>
    | null;
  const users = Array.isArray(data) ? data : data?.users ?? [];
  return users.some((u) => u.email?.toLowerCase() === email);
}
