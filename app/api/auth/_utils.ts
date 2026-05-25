import { env } from "@/lib/env";
import { normalizeNextPath } from "@/lib/auth/validation";
import { getRequestAppUrl } from "@/lib/appUrl";

export function getAppUrl(request: Request): URL {
  const requestUrl = new URL(getRequestAppUrl(request));
  if (isLocalHost(requestUrl.hostname)) {
    return requestUrl;
  }
  return new URL(env.NEXT_PUBLIC_APP_URL ?? requestUrl.toString());
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

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}
