import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

const PHASES = [
  {
    id: "llegada",
    tag: "Primero",
    title: "Llegas con lo que te tiene así",
    body:
      "Cuéntalo como te sale: ordenado, hecho un nudo, con miedo, con rabia. No hay forma correcta de empezar.",
    example: "“No sé si renunciar o aguantar otros seis meses.”",
    detail: "Habla tú",
  },
  {
    id: "escucha",
    tag: "Luego",
    title: "Los tres te escuchan a la vez",
    body:
      "Cada uno responde desde lo que cuida. No esperan turno, no se copian. Ves tres miradas distintas sobre lo mismo, casi al mismo tiempo.",
    example: "“A 3 años, lo que cuidarías no es el ingreso, es la opción.”",
    detail: "Tres voces en paralelo",
  },
  {
    id: "tension",
    tag: "Entonces",
    title: "Alguien señala lo que falta",
    body:
      "Cuando dos de ellos se contradicen en serio, una de las voces toma la palabra y nombra la grieta. Una sola, sin teatro.",
    example: "“Marco, le estás pidiendo paciencia a alguien que ya quemó dos años.”",
    detail: "Una pregunta incómoda",
  },
  {
    id: "tu-turno",
    tag: "Tu turno",
    title: "Respondes lo que aparezca",
    body:
      "Aclaras, dudas, contestas, te corriges. Puedes seguir hablando o pedirles que cierren contigo lo que ya vieron.",
    example: "“Olvidamos el costo de seguir esperando.”",
    detail: "Sin botones que te empujen",
  },
  {
    id: "cierre",
    tag: "Al cerrar",
    title: "Te devuelven los caminos",
    body:
      "Dos o tres caminos, con lo que cada uno te pide ceder. Sin recomendación, sin ganador. La decisión vuelve a tus manos, más clara.",
    example: "“Camino A protege ingreso; cede opción. Camino B preserva opción; cede estabilidad.”",
    detail: "Te la puedes llevar contigo",
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
              Cómo es una sesión
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              Una conversación tranquila, no un test.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground-soft">
              No tienes que prepararte. No hay preguntas trampa. Llegas con lo
              que traes y te vas con más claridad sobre lo que estás eligiendo.
            </p>
          </header>
        </Reveal>

        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {PHASES.map((phase, idx) => (
            <Reveal key={phase.id} as="li" delay={idx * 80}>
              <article className="group relative flex h-full flex-col gap-3 rounded-council-lg border border-border bg-surface p-5 shadow-soft transition-all duration-500 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-council">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-accent-strong">
                    {phase.tag}
                  </span>
                  <span className="text-[10px] tabular-nums text-subtle">
                    0{idx + 1}
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
                <p className="mt-auto text-[10px] uppercase tracking-[0.14em] text-subtle">
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
