"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { isValidEmail, sanitizeEmail } from "@/lib/auth/validation";
import { saveEntryEmail } from "@/lib/auth/flow";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AccountCheckOverlay({ open, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanEmail = sanitizeEmail(email);
  const valid = isValidEmail(cleanEmail);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 120);
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) {
      setError("Escribe un correo válido.");
      return;
    }

    setSubmitting(true);
    setError(null);
    saveEntryEmail(cleanEmail);

    const response = await fetch(
      `/api/auth/check-email?email=${encodeURIComponent(cleanEmail)}`,
    );
    const data = (await response.json().catch(() => null)) as
      | { exists?: boolean; error?: string }
      | null;

    if (!response.ok || typeof data?.exists !== "boolean") {
      setError(data?.error ?? "No pudimos revisar ese correo.");
      setSubmitting(false);
      return;
    }

    if (data.exists) {
      router.push(
        `/login?mode=login&next=/session&email=${encodeURIComponent(cleanEmail)}` as never,
      );
      return;
    }

    router.push(`/onboarding?email=${encodeURIComponent(cleanEmail)}` as never);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/45 px-4 py-6 backdrop-blur-sm"
      style={{ animation: "sidebar-fade-in 180ms ease-out both" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-check-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-[34rem] overflow-hidden rounded-council-lg border border-border-strong/80 bg-surface text-left shadow-[0_28px_90px_-28px_rgb(31_24_21_/_0.55)] ring-1 ring-white/70"
        style={{ animation: "soft-rise 260ms ease-out both" }}
        noValidate
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-elena to-marco"
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid size-10 place-items-center rounded-full border border-border-strong/70 bg-surface text-muted shadow-soft transition hover:border-accent hover:bg-accent-soft hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          aria-label="Cerrar"
        >
          <CloseIcon />
        </button>

        <div className="px-6 pb-5 pt-7 md:px-8 md:pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Acceso
          </p>
          <h2
            id="account-check-title"
            className="mt-3 max-w-sm text-balance text-2xl font-semibold tracking-tight text-foreground md:text-3xl"
          >
            Revisemos tu correo
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted md:text-base">
            Si ya tienes cuenta, te llevamos a iniciar sesión. Si no, abrimos tu
            onboarding con este correo.
          </p>
        </div>

        <div className="border-y border-border bg-elevated/80 px-6 py-5 md:px-8">
          <label className="grid gap-2 text-sm font-medium text-foreground-soft">
            Correo
            <input
              ref={inputRef}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              onBlur={() => setEmail(cleanEmail)}
              placeholder="tu@correo.com"
              autoComplete="email"
              disabled={submitting}
              aria-invalid={email.length > 0 && !valid}
              aria-describedby={error ? "account-check-error" : undefined}
              className="min-h-12 rounded-council border border-border-strong bg-surface px-4 py-3 text-base text-foreground shadow-soft outline-none transition placeholder:text-subtle disabled:cursor-wait disabled:bg-surface-soft focus:border-accent focus:ring-4 focus:ring-accent/20"
            />
          </label>

          {error && (
            <p
              id="account-check-error"
              className="mt-3 rounded-council border border-error/35 bg-error/10 px-4 py-3 text-sm font-medium text-error"
            >
              {error}
            </p>
          )}
        </div>

        <div className="px-6 pb-6 pt-5 md:px-8 md:pb-8">
          <Button
            type="submit"
            className="min-h-12 w-full text-base"
            disabled={!valid || submitting}
          >
            {submitting && (
              <span
                aria-hidden
                className="size-4 rounded-full border-2 border-accent-foreground/45 border-t-accent-foreground"
                style={{ animation: "spin 700ms linear infinite" }}
              />
            )}
            {submitting ? "Revisando..." : "Continuar"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
