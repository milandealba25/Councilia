"use client";

import Link from "next/link";
import { buildPlanLimitModalCopy, type PlanLimitPayload } from "@/lib/billing/planLimitUi";

interface PlanLimitModalProps {
  payload: PlanLimitPayload;
  onClose: () => void;
}

export function PlanLimitModal({ payload, onClose }: PlanLimitModalProps) {
  const copy = buildPlanLimitModalCopy(payload);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      aria-labelledby="plan-limit-title"
      onClick={onClose}
    >
      <div
        className="mx-auto w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl"
        style={{ animation: "soft-rise 200ms ease-out both" }}
        onClick={(event) => event.stopPropagation()}
      >
        <p
          id="plan-limit-title"
          className="text-base font-semibold text-foreground"
        >
          {copy.title}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{copy.description}</p>
        {copy.hint ? (
          <p className="mt-2 text-sm leading-relaxed text-foreground/85">
            {copy.hint}
          </p>
        ) : null}
        {payload.message && payload.code !== "VOICE_NOT_AVAILABLE" ? (
          <p className="mt-3 rounded-lg border border-border/70 bg-elevated/60 px-3 py-2 text-xs text-muted">
            {payload.message}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted transition hover:bg-elevated hover:text-foreground"
          >
            Cerrar
          </button>
          <Link
            href="/account?from=session#upgrade-pro"
            className="inline-flex items-center justify-center rounded-council bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground shadow-council transition hover:bg-accent-strong"
            onClick={onClose}
          >
            Ver planes
          </Link>
        </div>
      </div>
    </div>
  );
}
