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
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/18 px-4 backdrop-blur-[6px]"
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
        className="relative w-full max-w-lg overflow-hidden rounded-council-lg border border-border/80 bg-surface/92 p-6 shadow-council-lg backdrop-blur md:p-8"
        style={{ animation: "soft-rise 260ms ease-out both" }}
        noValidate
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full border border-border bg-surface text-muted transition hover:border-accent hover:text-foreground"
          aria-label="Cerrar"
        >
          <CloseIcon />
        </button>

        <p className="text-xs font-medium uppercase tracking-widest text-accent">
          Acceso
        </p>
        <h2
          id="account-check-title"
          className="mt-3 text-balance text-2xl font-semibold tracking-tight text-foreground md:text-3xl"
        >
          Revisa si ya tienes cuenta
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
          Escribe tu correo y te llevamos al siguiente paso correcto.
        </p>

        <label className="mt-6 grid gap-2 text-sm text-foreground-soft">
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
            aria-invalid={email.length > 0 && !valid}
            className="rounded-council border border-border-strong/70 bg-surface px-4 py-3 text-base text-foreground shadow-soft outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </label>

        {error && (
          <p className="mt-3 rounded-council border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="mt-5 w-full"
          disabled={!valid || submitting}
        >
          {submitting ? "Revisando..." : "Continuar"}
        </Button>
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
