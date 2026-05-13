import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

const PRINCIPLES = [
  {
    n: "01",
    title: "Aquí nadie te va a empujar.",
    body:
      "El council nunca cierra con una recomendación. Te devuelve los caminos visibles y se queda en silencio. Lo que sigue lo eliges tú.",
  },
  {
    n: "02",
    title: "El desacuerdo no es teatro.",
    body:
      "Marco, Elena y Rafael no “opinan distinto” por estilo. Cada uno cuida algo distinto de ti, y por eso no convergen a la fuerza.",
  },
  {
    n: "03",
    title: "Una pregunta dura vale más que veinte.",
    body:
      "Si dos voces se contradicen, sale solo una réplica. Una buena pregunta incómoda hace más por ti que una pelea entre robots.",
  },
  {
    n: "04",
    title: "Te llevas lo que pasó.",
    body:
      "La conversación, los caminos y los matices se pueden guardar y revisar más tarde, en frío. No se evaporan al cerrar la pestaña.",
  },
  {
    n: "05",
    title: "Si algo duele mucho, paramos.",
    body:
      "Si aparece una crisis emocional, el council se calla y te entrega recursos profesionales verificados. Tu bienestar pesa más que la sesión.",
  },
  {
    n: "06",
    title: "Tu intimidad se respeta.",
    body:
      "Solo guardamos lo necesario para que la conversación tenga continuidad. Tú decides cuándo borrarlo todo.",
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
              Lo que cuidamos
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              Lo que prometemos —y lo que nunca vamos a hacer.
            </h2>
          </header>
        </Reveal>

        <ul className="grid gap-px overflow-hidden rounded-council-lg border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((p, idx) => (
            <Reveal key={p.n} as="li" delay={(idx % 3) * 80}>
              <article className="flex h-full flex-col gap-3 bg-surface p-7 md:p-8">
                <div className="flex items-baseline gap-3">
                  <span className="text-[11px] tabular-nums text-accent-strong">
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
