import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

const PRINCIPLES = [
  {
    n: "01",
    title: "El desacuerdo emerge de funciones objetivo incompatibles",
    body:
      "No de prompts de personalidad. Cualquier sistema que solo cambie el tono converge al consenso.",
  },
  {
    n: "02",
    title: "La síntesis nombra tensiones, no las neutraliza",
    body:
      "Nunca recomienda. Nunca balancea artificialmente. No inventa un cuarto camino intermedio para complacer al usuario.",
  },
  {
    n: "03",
    title: "Menos interacción entre agentes es más",
    body:
      "Una contradicción útil vale más que veinte mensajes teatrales. Una sola réplica por turno.",
  },
  {
    n: "05",
    title: "El usuario decide al final",
    body:
      "El council nunca decide por ti. Sin botones tipo «el council recomienda…», sin ranking de caminos.",
  },
  {
    n: "07",
    title: "Streaming desde el primer token",
    body:
      "La percepción de velocidad es producto. No hay «spinner mientras pensamos».",
  },
  {
    n: "09",
    title: "Crisis emocional gana siempre",
    body:
      "Si se detecta crisis aguda, el producto se calla y entrega recursos profesionales verificados.",
  },
] as const;

export function PrinciplesSection() {
  return (
    <section
      id="principios"
      className="border-t border-border/70 py-24 md:py-32"
    >
      <Container>
        <Reveal>
          <header className="mb-14 max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-strong">
              Principios
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              No competimos en respuestas correctas. Competimos en pensar mejor.
            </h2>
          </header>
        </Reveal>

        <ul className="grid gap-px overflow-hidden rounded-council-lg border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((p, idx) => (
            <Reveal key={p.n} as="li" delay={(idx % 3) * 70}>
              <article className="flex h-full flex-col gap-3 bg-surface p-7 md:p-8">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] tabular-nums text-accent-strong">
                    {p.n}
                  </span>
                  <span className="h-px flex-1 bg-border-strong/40" />
                </div>
                <h3 className="text-base font-semibold leading-snug text-foreground">
                  {p.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-foreground-soft">
                  {p.body}
                </p>
              </article>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
