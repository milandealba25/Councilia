const LOCAL_APP_URL = "http://localhost:3000";

export function getPublicAppUrl(): string {
  return firstBaseUrl(
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
    LOCAL_APP_URL,
  );
}

export function getRequestAppUrl(request: Request): string {
  return firstBaseUrl(
    process.env.NEXT_PUBLIC_APP_URL,
    requestOrigin(request),
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    LOCAL_APP_URL,
  );
}

function requestOrigin(request: Request): string | null {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

function firstBaseUrl(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    if (!candidate?.trim()) continue;
    return normalizeBaseUrl(candidate);
  }
  return LOCAL_APP_URL;
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(withProtocol(value.trim()));
  const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
  return `${url.protocol}//${url.host}${pathname}`;
}

function withProtocol(value: string): string {
  return /^[a-z][a-z\d+\-.]*:\/\//i.test(value) ? value : `https://${value}`;
}
