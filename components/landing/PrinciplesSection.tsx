import { Container } from "@/components/ui/Container";

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
      "Nunca recomienda. Nunca balancea artificialmente. No inventa un cuarto camino intermedio para complacer.",
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
      "Si se detecta crisis, el producto se calla y entrega recursos profesionales verificados.",
  },
] as const;

export function PrinciplesSection() {
  return (
    <section id="principios" className="border-t border-border/60 py-24 md:py-32">
      <Container>
        <header className="mb-14 max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-widest text-accent">
            03 — Principios
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            No competimos en respuestas correctas.{" "}
            <span className="text-muted">
              Competimos en pensar mejor.
            </span>
          </h2>
        </header>

        <ul className="grid gap-px overflow-hidden rounded-council border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <li key={p.n} className="flex flex-col gap-3 bg-background p-6">
              <span className="font-mono text-xs font-medium text-muted">
                Principio {p.n}
              </span>
              <h3 className="text-base font-semibold leading-snug text-foreground">
                {p.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted">{p.body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
