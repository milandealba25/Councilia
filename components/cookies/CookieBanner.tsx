"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  buildAcceptAll,
  buildRejectNonEssential,
  loadPrefs,
  savePrefs,
} from "@/lib/cookies/preferences";
import { Button } from "@/components/ui/Button";

/**
 * Banner de consentimiento (R5). Aparece SOLO si no hay preferencias guardadas.
 * Bloquea analítica por defecto (doc 13 §5).
 */
export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const existing = loadPrefs();
    if (!existing) setOpen(true);
  }, []);

  if (!open) return null;

  function accept() {
    savePrefs(buildAcceptAll());
    setOpen(false);
  }
  function reject() {
    savePrefs(buildRejectNonEssential());
    setOpen(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      data-print="hide"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-council border border-border bg-elevated/95 p-5 shadow-council backdrop-blur md:inset-x-auto md:right-6 md:bottom-6 md:left-6"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <p className="font-mono text-[11px] uppercase tracking-wider text-accent">
            Cookies
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground/90">
            Usamos cookies estrictamente necesarias para el funcionamiento del
            servicio. Las analíticas y funcionales son opcionales y solo se
            activan con tu consentimiento.{" "}
            <Link
              href="/cookies"
              className="text-accent underline-offset-4 hover:underline"
            >
              Más detalle
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={reject}>
            Solo necesarias
          </Button>
          <Button onClick={accept}>Aceptar todas</Button>
        </div>
      </div>
    </div>
  );
}
