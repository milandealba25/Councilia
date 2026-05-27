/** @type {import('next').NextConfig} */

/**
 * Q2 · Headers de seguridad para el documento principal.
 *
 * - CSP estricta pero compatible con Next.js (necesita 'unsafe-inline' para
 *   estilos inline de Next y 'unsafe-eval' para react-dev-overlay en dev).
 * - HSTS, X-Content-Type-Options, Referrer-Policy y Permissions-Policy
 *   estándar para alcanzar ≥A en securityheaders.com.
 */
const isProd = process.env.NODE_ENV === "production";

const cspDirectives = [
  "default-src 'self'",
  // Next emite estilos inline; en producción tampoco evita 'unsafe-inline' en style.
  "style-src 'self' 'unsafe-inline'",
  // 'unsafe-eval' SOLO en dev (react-refresh). En prod queda más estricto.
  isProd
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://generativelanguage.googleapis.com https://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
];

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspDirectives.join("; "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), browsing-topics=()",
  },
];

const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
