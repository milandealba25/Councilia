"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, LinkButton } from "@/components/ui/Button";
import { saveAuthSession, type AuthSession } from "@/lib/auth/client";
import { resolvePostAuthRedirect } from "@/lib/auth/flow";
import {
  getPasswordRules,
  isValidEmail,
  isValidName,
  isValidPassword,
  normalizeNextPath,
  sanitizeEmail,
  sanitizeName,
  sanitizePassword,
} from "@/lib/auth/validation";

type AuthMode = "login" | "register";

interface PasswordAuthResponse {
  ok?: boolean;
  error?: string;
  message?: string;
  needsEmailConfirmation?: boolean;
  session?: AuthSession;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = useMemo(
    () => normalizeNextPath(params.get("next")),
    [params],
  );
  const reason = params.get("reason");
  const routeError = params.get("error");
  const requestedMode = params.get("mode") === "register" ? "register" : "login";
  const requestedEmail = sanitizeEmail(params.get("email"));
  const [mode, setMode] = useState<AuthMode>(requestedMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(requestedEmail);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(() =>
    routeError ? formatRouteError(routeError) : null,
  );

  const cleanName = sanitizeName(name);
  const cleanEmail = sanitizeEmail(email);
  const cleanPassword = sanitizePassword(password);
  const nameValid = mode === "login" || isValidName(cleanName);
  const emailValid = isValidEmail(cleanEmail);
  const passwordRules = getPasswordRules(cleanPassword);
  const passwordValid = isValidPassword(cleanPassword);
  const formValid = nameValid && emailValid && passwordValid;

  useEffect(() => {
    setMode(requestedMode);
    if (requestedEmail) setEmail(requestedEmail);
  }, [requestedEmail, requestedMode]);

  useEffect(() => {
    async function routeActiveSession() {
      const destination = await resolvePostAuthRedirect(next);
      if (destination !== "/login") {
        router.replace(destination as never);
      }
    }

    void routeActiveSession();
  }, [next, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid || submitting) return;

    setSubmitting(true);
    setNotice(null);
    setError(null);

    const response = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: mode === "register" ? cleanName : undefined,
        email: cleanEmail,
        password: cleanPassword,
        mode,
      }),
    });

    const data = (await response.json().catch(() => null)) as
      | PasswordAuthResponse
      | null;

    if (!response.ok || !data?.ok) {
      setError(data?.error ?? "No pudimos completar el acceso.");
      setSubmitting(false);
      return;
    }

    if (data.needsEmailConfirmation) {
      setNotice(
        data.message ??
          "Cuenta creada. Revisa tu correo para confirmar el acceso.",
      );
      setSubmitting(false);
      return;
    }

    if (!data.session) {
      setError("Supabase no devolvió una sesión válida.");
      setSubmitting(false);
      return;
    }

    saveAuthSession(data.session);
    const destination = await resolvePostAuthRedirect(next);
    router.replace(destination as never);
  }

  return (
    <div className="grid gap-5">
      {reason === "survey" && (
        <div
          className="rounded-council border border-accent/30 bg-accent-soft/35 px-4 py-3 text-sm leading-relaxed text-foreground-soft"
          style={{ animation: "soft-rise 450ms ease-out both" }}
        >
          Tus respuestas ya quedaron guardadas. Al entrar, las asociamos a tu
          cuenta para que el council recuerde lo importante.
        </div>
      )}

      <div
        className="grid grid-cols-2 rounded-council border border-border/70 bg-surface-soft/65 p-1"
        role="tablist"
        aria-label="Tipo de acceso"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          onClick={() => {
            setMode("login");
            setError(null);
            setNotice(null);
          }}
          className={`rounded-[0.55rem] px-4 py-2 text-sm font-medium transition-all ${
            mode === "login"
              ? "bg-surface text-foreground shadow-soft"
              : "text-muted hover:text-foreground"
          }`}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "register"}
          onClick={() => {
            setMode("register");
            setError(null);
            setNotice(null);
          }}
          className={`rounded-[0.55rem] px-4 py-2 text-sm font-medium transition-all ${
            mode === "register"
              ? "bg-surface text-foreground shadow-soft"
              : "text-muted hover:text-foreground"
          }`}
        >
          Crear cuenta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
        {mode === "register" && (
          <label
            className="grid gap-2 text-sm text-foreground-soft"
            style={{ animation: "soft-rise 260ms ease-out both" }}
          >
            Nombre
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
                setNotice(null);
              }}
              onBlur={() => setName(cleanName)}
              placeholder="Tu nombre"
              autoComplete="name"
              className="rounded-council border border-border-strong/70 bg-surface/85 px-4 py-3 text-foreground shadow-soft outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
              aria-invalid={name.length > 0 && !nameValid}
              required
            />
            {name.length > 0 && !nameValid && (
              <span className="text-xs text-error">
                Escribe tu nombre con al menos 2 caracteres.
              </span>
            )}
          </label>
        )}

        <label className="grid gap-2 text-sm text-foreground-soft">
          Correo
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
              setNotice(null);
            }}
            onBlur={() => setEmail(cleanEmail)}
            placeholder="tu@correo.com"
            autoComplete="email"
            className="rounded-council border border-border-strong/70 bg-surface/85 px-4 py-3 text-foreground shadow-soft outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            aria-invalid={email.length > 0 && !emailValid}
            required
          />
          {email.length > 0 && !emailValid && (
            <span className="text-xs text-error">
              Escribe un correo válido.
            </span>
          )}
        </label>

        <label className="grid gap-2 text-sm text-foreground-soft">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
              setNotice(null);
            }}
            onBlur={() => setPassword(cleanPassword)}
            placeholder="Mínimo 8 caracteres"
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            className="rounded-council border border-border-strong/70 bg-surface/85 px-4 py-3 text-foreground shadow-soft outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            aria-invalid={password.length > 0 && !passwordValid}
            required
          />
        </label>

        <ul className="grid gap-1.5 rounded-council border border-border/70 bg-surface-soft/45 px-4 py-3 text-xs text-muted">
          {passwordRules.map((rule) => (
            <li
              key={rule.id}
              className={`flex items-center gap-2 ${
                rule.valid ? "text-marco" : "text-muted"
              }`}
            >
              <span
                className={`grid size-4 place-items-center rounded-full border text-[10px] ${
                  rule.valid
                    ? "border-marco bg-marco text-white"
                    : "border-border-strong"
                }`}
                aria-hidden
              >
                {rule.valid ? "✓" : ""}
              </span>
              {rule.label}
            </li>
          ))}
        </ul>

        <Button type="submit" disabled={!formValid || submitting}>
          {submitting
            ? mode === "register"
              ? "Creando cuenta…"
              : "Iniciando sesión…"
            : mode === "register"
              ? "Crear cuenta"
              : "Iniciar sesión"}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-subtle">
        <span className="h-px flex-1 bg-border" />
        o
        <span className="h-px flex-1 bg-border" />
      </div>

      <LinkButton
        href={`/api/auth/google?next=${encodeURIComponent(next)}`}
        variant="secondary"
        className="w-full"
      >
        <GoogleIcon />
        Entrar con Google
      </LinkButton>

      {notice && (
        <p
          className="rounded-council border border-marco/30 bg-marco-soft/70 px-4 py-3 text-sm leading-relaxed text-foreground-soft"
          style={{ animation: "soft-rise 350ms ease-out both" }}
        >
          {notice}
        </p>
      )}

      {error && (
        <p className="rounded-council border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-5"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function formatRouteError(value: string): string {
  if (value === "supabase_not_configured") {
    return "Supabase todavía no está configurado. Completa las variables y el proveedor de Google antes de probar este acceso.";
  }
  return "No pudimos iniciar sesión. Inténtalo de nuevo.";
}
