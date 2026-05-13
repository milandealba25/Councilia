import { Container } from "@/components/ui/Container";

const PHASES = [
  {
    id: "setup",
    tag: "Fase 0",
    title: "Setup invisible",
    body:
      "El orquestador lee tu contexto y lanza las 3 llamadas en paralelo. Aparecen los 3 avatares; nada de spinners.",
    detail: "~1 segundo",
  },
  {
    id: "posturas",
    tag: "Fase 1",
    title: "Posturas en paralelo",
    body:
      "Los 3 agentes responden al mismo tiempo, con streaming desde el primer token, sin haber leído a los otros.",
    detail: "<6s · 3 cards simultáneas",
  },
  {
    id: "replica",
    tag: "Fase 2",
    title: "Réplica selectiva",
    body:
      "El Tension Detector elige el par con mayor contradicción y dispara una sola réplica. Una contradicción útil > veinte mensajes teatrales.",
    detail: "1 réplica · automática",
  },
  {
    id: "decision",
    tag: "Fase 3",
    title: "Tu turno",
    body:
      "Escribes un nuevo mensaje o pides la síntesis. No hay tres botones; no hay parálisis de decisión.",
    detail: "2 opciones, no más",
  },
  {
    id: "sintesis",
    tag: "Fase 4",
    title: "Síntesis con tradeoffs",
    body:
      "2–3 caminos visibles, los tradeoffs irreductibles entre ellos y una frase que te devuelve el poder de decidir. Nunca recomienda.",
    detail: "Exportable a PDF / markdown",
  },
] as const;

export function FlowSection() {
  return (
    <section
      id="flujo"
      className="relative border-t border-border/70 py-24 md:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-surface-soft/40 via-transparent to-transparent"
      />
      <Container>
        <header className="mb-14 max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-widest text-accent-strong">
            02 — Cómo funciona
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
            Cuatro fases visibles.{" "}
            <span className="text-foreground-soft">
              Una conversación con orden claro.
            </span>
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground-soft">
            Sin interrupción del streaming, sin botones de decisión por turno.
            El orquestador propio (no LangChain ni CrewAI) decide quién responde
            a quién para maximizar tensión informativa.
          </p>
        </header>

        <ol className="relative grid gap-4 md:grid-cols-5 md:gap-3">
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-border-strong to-transparent md:block"
          />
          {PHASES.map((phase, idx) => (
            <li
              key={phase.id}
              className="group relative flex flex-col gap-3 rounded-council-lg border border-border bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-council"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-accent-soft font-mono text-xs font-semibold text-accent-strong ring-1 ring-accent/30">
                  0{idx}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-subtle">
                  {phase.tag}
                </span>
              </div>
              <h3 className="text-base font-semibold leading-snug text-foreground">
                {phase.title}
              </h3>
              <p className="text-sm leading-relaxed text-foreground-soft">
                {phase.body}
              </p>
              <p className="mt-auto font-mono text-[11px] uppercase tracking-wider text-subtle">
                {phase.detail}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
