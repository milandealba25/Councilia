import { env } from "@/lib/env";
import { normalizeNextPath } from "@/lib/auth/validation";
import { getRequestAppUrl } from "@/lib/appUrl";

export function getAppUrl(request: Request): URL {
  return new URL(env.NEXT_PUBLIC_APP_URL ?? getRequestAppUrl(request));
}

export { normalizeNextPath };

export function getLoginErrorUrl(
  request: Request,
  error: string,
  next = "/",
): URL {
  const appUrl = getAppUrl(request);
  const loginUrl = new URL("/login", appUrl);
  loginUrl.searchParams.set("error", error);
  loginUrl.searchParams.set("next", normalizeNextPath(next));
  return loginUrl;
}
