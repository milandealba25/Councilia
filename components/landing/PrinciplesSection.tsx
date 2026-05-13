import { Container } from "@/components/ui/Container";

const PRINCIPLES = [
  {
    n: "01",
    title: "El desacuerdo emerge de funciones objetivo incompatibles",
    body:
      "No de prompts de personalidad. Cualquier sistema que solo cambie el tono converge al consenso.",
    tint: "var(--marco-soft)",
    color: "var(--marco)",
  },
  {
    n: "02",
    title: "La síntesis nombra tensiones, no las neutraliza",
    body:
      "Nunca recomienda. Nunca balancea artificialmente. No inventa un cuarto camino intermedio para complacer.",
    tint: "var(--elena-soft)",
    color: "var(--elena)",
  },
  {
    n: "03",
    title: "Menos interacción entre agentes es más",
    body:
      "Una contradicción útil vale más que veinte mensajes teatrales. Una sola réplica por turno.",
    tint: "var(--rafael-soft)",
    color: "var(--rafael)",
  },
  {
    n: "05",
    title: "El usuario decide al final",
    body:
      "El council nunca decide por ti. Sin botones tipo «el council recomienda…», sin ranking de caminos.",
    tint: "var(--accent-soft)",
    color: "var(--accent)",
  },
  {
    n: "07",
    title: "Streaming desde el primer token",
    body:
      "La percepción de velocidad es producto. No hay «spinner mientras pensamos».",
    tint: "var(--elena-soft)",
    color: "var(--elena)",
  },
  {
    n: "09",
    title: "Crisis emocional gana siempre",
    body:
      "Si se detecta crisis, el producto se calla y entrega recursos profesionales verificados.",
    tint: "var(--rafael-soft)",
    color: "var(--rafael)",
  },
] as const;

export function PrinciplesSection() {
  return (
    <section
      id="principios"
      className="border-t border-border/70 py-24 md:py-32"
    >
      <Container>
        <header className="mb-14 max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-widest text-accent-strong">
            03 — Principios
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
            No competimos en respuestas correctas.{" "}
            <span className="text-foreground-soft">
              Competimos en pensar mejor.
            </span>
          </h2>
        </header>

        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <li
              key={p.n}
              className="group relative flex flex-col gap-3 overflow-hidden rounded-council-lg border border-border bg-surface p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-council-lg"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-70 blur-2xl transition group-hover:opacity-100"
                style={{ background: p.tint }}
              />
              <span
                className="relative inline-flex size-11 items-center justify-center rounded-full font-mono text-sm font-semibold"
                style={{
                  background: p.tint,
                  color: p.color,
                  boxShadow: `inset 0 0 0 1px ${p.color}33`,
                }}
              >
                {p.n}
              </span>
              <h3 className="relative text-base font-semibold leading-snug text-foreground">
                {p.title}
              </h3>
              <p className="relative text-sm leading-relaxed text-foreground-soft">
                {p.body}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
