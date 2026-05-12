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
      className="border-t border-border/60 bg-elevated/30 py-24 md:py-32"
    >
      <Container>
        <header className="mb-14 max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-widest text-accent">
            02 — Cómo funciona
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Cuatro fases visibles.{" "}
            <span className="text-muted">Una conversación con orden claro.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            Sin interrupción del streaming, sin botones de decisión por turno. El
            orquestador propio (no LangChain ni CrewAI) decide quién responde a
            quién para maximizar tensión informativa.
          </p>
        </header>

        <ol className="grid gap-px overflow-hidden rounded-council border border-border bg-border md:grid-cols-5">
          {PHASES.map((phase, idx) => (
            <li
              key={phase.id}
              className="relative flex flex-col gap-3 bg-background p-6 md:bg-elevated/60"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-accent">
                  {phase.tag}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-muted">
                  0{idx}
                </span>
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {phase.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted">{phase.body}</p>
              <p className="mt-auto font-mono text-[11px] uppercase tracking-wider text-muted/80">
                {phase.detail}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
