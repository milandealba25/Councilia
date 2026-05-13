import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

const PHASES = [
  {
    id: "setup",
    tag: "Fase 00",
    title: "Setup invisible",
    body:
      "El orquestador lee tu contexto del onboarding y lanza las tres llamadas en paralelo. Aparecen los avatares; cero spinners.",
    example: "“Reuniendo a Marco, Elena y Rafael…”",
    detail: "≈1 segundo",
  },
  {
    id: "posturas",
    tag: "Fase 01",
    title: "Posturas en paralelo",
    body:
      "Los tres deliberantes responden al mismo tiempo, con streaming desde el primer token, sin haber leído lo que los otros están escribiendo.",
    example: "“A 3 años, lo que protegerías no es el ingreso, es la opción.”",
    detail: "<6 s · tres mensajes simultáneos",
  },
  {
    id: "replica",
    tag: "Fase 02",
    title: "Réplica selectiva",
    body:
      "El detector de tensión elige el par con mayor contradicción y dispara una sola réplica. Una contradicción útil vale más que veinte mensajes teatrales.",
    example: "“Marco, le estás pidiendo paciencia a alguien que ya quemó dos años.”",
    detail: "Una réplica · automática",
  },
  {
    id: "decision",
    tag: "Fase 03",
    title: "Tu turno",
    body:
      "Respondes con otro mensaje, o pides la síntesis. No hay tres botones; no hay parálisis de decisión.",
    example: "“Pero olvidamos el costo emocional de seguir esperando.”",
    detail: "Dos opciones · no más",
  },
  {
    id: "sintesis",
    tag: "Fase 04",
    title: "Síntesis con tradeoffs",
    body:
      "Dos o tres caminos visibles, los tradeoffs irreductibles entre ellos y una frase que te devuelve el poder de decidir. Nunca recomienda.",
    example: "“Camino A protege ingreso; cede opción. Camino B preserva opción; cede estabilidad.”",
    detail: "Exportable a PDF o markdown",
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
        <Reveal>
          <header className="mb-14 max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-strong">
              Cómo funciona
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              Cinco fases visibles. Una conversación con orden claro.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground-soft">
              Sin interrupción del streaming, sin botones de decisión por turno.
              El orquestador propio decide quién responde a quién para maximizar
              la tensión informativa, no para teatralizar la conversación.
            </p>
          </header>
        </Reveal>

        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {PHASES.map((phase, idx) => (
            <Reveal key={phase.id} as="li" delay={idx * 70}>
              <article className="group relative flex h-full flex-col gap-3 rounded-council-lg border border-border bg-surface p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-council">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent-strong">
                    {phase.tag}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-subtle">
                    0{idx}
                  </span>
                </div>
                <h3 className="text-[15px] font-semibold leading-snug text-foreground">
                  {phase.title}
                </h3>
                <p className="text-[13.5px] leading-relaxed text-foreground-soft">
                  {phase.body}
                </p>
                <div className="rounded-md bg-surface-soft/70 px-3 py-2 text-[12px] italic leading-relaxed text-foreground-soft ring-1 ring-border/60">
                  {phase.example}
                </div>
                <p className="mt-auto font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">
                  {phase.detail}
                </p>
              </article>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  );
}
