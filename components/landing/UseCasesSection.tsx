import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

const CASES = [
  {
    title: "Cuando algo grande en tu vida está por cambiar",
    body:
      "Renunciar, aceptar la oferta, esperar otros seis meses. Lo que parece un cálculo también es la pregunta de qué versión de ti se vuelve más probable.",
    show:
      "Qué cuesta el peor escenario · qué cambia a dos años · qué no te has atrevido a verificar",
  },
  {
    title: "Cuando lo que decidas también toca a otras personas",
    body:
      "Mudanza, sociedad, ruptura, hacer algo con alguien. Lo emocional y lo material no se separan; aquí se nombran por separado, sin mezclarte el corazón.",
    show:
      "Qué cedes con cada camino · qué te llevas si dices que sí · qué se queda si dices que no",
  },
  {
    title: "Cuando algo no se siente bien y no sabes por qué",
    body:
      "Hay una incomodidad que no se va, pero todavía no le pones nombre. Tres miradas a la vez suelen revelar la fricción que la prisa te tapa.",
    show:
      "El supuesto frágil · el escenario que estás evitando · la pregunta que llevas tiempo posponiendo",
  },
  {
    title: "Cuando tienes que decidir pronto y no quieres equivocarte solo",
    body:
      "Cuando el tiempo aprieta, hablar con uno mismo confirma lo que ya pensaste. Aquí ves lo que estás descartando sin haberlo mirado.",
    show:
      "Caminos que no estabas viendo · qué pesa a 30 días vs. a 3 años · qué falta saber antes de decidir",
  },
] as const;

export function UseCasesSection() {
  return (
    <section id="para-quien" className="border-t border-border/70 py-24 md:py-32">
      <Container>
        <Reveal>
          <header className="mb-14 max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-strong">
              Para qué vale la pena
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              Cuando una sola voz no alcanza.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground-soft">
              No estamos para reemplazar a tu terapeuta, a tu coach ni a tus
              amigos. Estamos para esos momentos en que necesitas pensar mejor
              antes de decidir, y hablarlo solo ya no te alcanza.
            </p>
          </header>
        </Reveal>

        <ol className="grid gap-px overflow-hidden rounded-council-lg border border-border bg-border md:grid-cols-2">
          {CASES.map((c, idx) => (
            <Reveal key={c.title} as="li" delay={idx * 80}>
              <article className="flex h-full flex-col gap-3 bg-surface p-7 md:p-8">
                <div className="flex items-baseline gap-3">
                  <span className="text-[11px] tabular-nums text-subtle">
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
                    Lo que se vuelve visible
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
