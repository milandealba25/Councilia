"use client";

import { useEffect, useState } from "react";
import {
  COOKIE_PREFS_VERSION,
  DEFAULT_PREFS,
  loadPrefs,
  savePrefs,
  type CookiePrefs,
} from "@/lib/cookies/preferences";
import { Button } from "@/components/ui/Button";

/**
 * Centro de preferencias (R5 §centro). El usuario puede ajustar categorías
 * después de haber dado su primer consentimiento.
 */
export function CookiePreferencesPanel() {
  const [prefs, setPrefs] = useState<CookiePrefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const existing = loadPrefs();
    if (existing) setPrefs(existing);
    setHydrated(true);
  }, []);

  function update<K extends keyof CookiePrefs>(key: K, value: CookiePrefs[K]) {
    setPrefs((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  function persist() {
    const next: CookiePrefs = {
      ...prefs,
      version: COOKIE_PREFS_VERSION,
      decidedAt: new Date().toISOString(),
      necessary: true,
    };
    savePrefs(next);
    setPrefs(next);
    setSaved(true);
  }

  if (!hydrated) {
    return (
      <div className="rounded-council border border-border bg-elevated/40 p-5 text-sm text-muted">
        Cargando preferencias…
      </div>
    );
  }

  return (
    <section className="rounded-council border border-border bg-elevated/40 p-6">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
          Tus preferencias
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">
          Centro de preferencias de cookies
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Estos ajustes solo aplican a este navegador. Las cookies estrictamente
          necesarias para que el servicio funcione no se pueden desactivar.
        </p>
      </header>

      <div className="mt-6 flex flex-col divide-y divide-border/60">
        <Row
          title="Estrictamente necesarias"
          description="Sesión, autenticación y seguridad. Sin estas el servicio no funciona."
          checked={true}
          disabled
        />
        <Row
          title="Funcionales"
          description="Recordar preferencias de UI (modo oscuro, idioma, último council usado)."
          checked={prefs.functional}
          onChange={(v) => update("functional", v)}
        />
        <Row
          title="Analíticas"
          description="Métricas agregadas y anónimas para mejorar el producto. Nunca se venden."
          checked={prefs.analytics}
          onChange={(v) => update("analytics", v)}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
        <Button onClick={persist}>Guardar preferencias</Button>
        {saved && (
          <span className="font-mono text-xs uppercase tracking-wider text-emerald-300">
            Guardado · {new Date(prefs.decidedAt).toLocaleString()}
          </span>
        )}
      </div>
    </section>
  );
}

function Row({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-6 py-4">
      <div className="flex-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-1 size-4 accent-accent disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={title}
      />
    </label>
  );
}
