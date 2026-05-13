import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

const CASES = [
  {
    title: "Una decisión laboral grande",
    body:
      "Renunciar, aceptar la oferta, esperar seis meses más. Lo que parece cuestión de números también es cuestión de qué versión de ti se vuelve más probable.",
    show:
      "Costo del peor escenario · efectos a 2 años · supuestos no verificados",
  },
  {
    title: "Una decisión que afecta a otros",
    body:
      "Mudanza, sociedad, ruptura, fundar algo con alguien. Lo emocional y lo material no se separan; el council los nombra por separado.",
    show:
      "Tradeoffs irreductibles · costo de oportunidad · qué te pierdes al elegir cada camino",
  },
  {
    title: "Una intuición que no termina de cuajar",
    body:
      "Algo no se siente bien y no sabes por qué. Tres lentes simultáneas suelen revelar la fricción que la urgencia te oculta.",
    show:
      "Supuesto frágil · escenario que estás evitando · pregunta que aún no te has hecho",
  },
  {
    title: "Una elección con plazos cortos",
    body:
      "Cuando el tiempo aprieta, una sola voz tiende a confirmar lo que ya pensaste. El council vuelve visibles las opciones que estás descartando sin verlas.",
    show:
      "Caminos alternativos · qué pesa más a 30 días vs. a 3 años · qué información falta",
  },
] as const;

export function UseCasesSection() {
  return (
    <section id="para-quien" className="border-t border-border/70 py-24 md:py-32">
      <Container>
        <Reveal>
          <header className="mb-14 max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-strong">
              Para qué sirve
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              Cuando una sola voz no alcanza.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground-soft">
              COUNCILia no reemplaza a tu terapeuta, a tu coach ni a tus amigos.
              Es una herramienta para pensar mejor antes de decidir, cuando la
              decisión importa y el ruido pesa.
            </p>
          </header>
        </Reveal>

        <ol className="grid gap-px overflow-hidden rounded-council-lg border border-border bg-border md:grid-cols-2">
          {CASES.map((c, idx) => (
            <Reveal key={c.title} as="li" delay={idx * 80}>
              <article className="flex h-full flex-col gap-3 bg-surface p-7 md:p-8">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] tabular-nums text-subtle">
                    0{idx + 1}
                  </span>
                  <h3 className="text-lg font-semibold leading-snug text-foreground">
                    {c.title}
                  </h3>
                </div>
                <p className="text-[15px] leading-relaxed text-foreground-soft">
                  {c.body}
                </p>
                <p className="mt-2 border-t border-border/60 pt-3 text-xs leading-relaxed text-subtle">
                  <span className="font-medium uppercase tracking-[0.14em] text-foreground-soft">
                    Lo que verás
                  </span>
                  <span className="mx-1.5 text-border-strong">·</span>
                  {c.show}
                </p>
              </article>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  );
}
