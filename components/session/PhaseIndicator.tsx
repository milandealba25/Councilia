export type Phase = "idle" | "fase1" | "fase2" | "wait" | "fase4";

const PHASES: ReadonlyArray<{ id: Phase; label: string }> = [
  { id: "idle", label: "Inicio" },
  { id: "fase1", label: "Posturas" },
  { id: "fase2", label: "Réplica" },
  { id: "wait", label: "Tu turno" },
  { id: "fase4", label: "Síntesis" },
];

interface Props {
  phase: Phase;
}

/**
 * Indicador horizontal sobrio del estado del flujo deliberativo.
 * No es un wizard — el usuario no controla la fase. Sólo informa.
 */
export function PhaseIndicator({ phase }: Props) {
  const activeIdx = PHASES.findIndex((p) => p.id === phase);
  return (
    <ol className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted">
      {PHASES.map((p, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <li key={p.id} className="flex items-center gap-2">
            <span
              className={[
                "inline-flex size-5 items-center justify-center rounded-full border text-[10px]",
                active
                  ? "border-accent bg-accent/20 text-accent"
                  : done
                    ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-300"
                    : "border-border text-muted/70",
              ].join(" ")}
            >
              {i}
            </span>
            <span
              className={
                active
                  ? "text-foreground"
                  : done
                    ? "text-foreground/70"
                    : "text-muted/70"
              }
            >
              {p.label}
            </span>
            {i < PHASES.length - 1 && (
              <span className="mx-1 h-px w-6 bg-border" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
