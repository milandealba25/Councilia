import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { AgentFace } from "@/components/agents/AgentFace";
import {
  AGENT_LABELS,
  AGENT_ROLES,
  AGENT_IDS,
  type AgentId,
} from "@/lib/agents/ids";

const DILEMMA =
  "Me ofrecieron un puesto con 40% más de sueldo pero implica mudarme a otra ciudad. Mi pareja quiere quedarse. Tengo que responder en 72 horas.";

const RESPONSES: Record<AgentId, string> = {
  marco:
    "Antes de decidir, pregúntate qué versión de tu vida es la que esta decisión te empuja a ser dentro de tres años. El sueldo es real, pero también es real el peso silencioso de dañar algo que querías sostener. ¿Qué horizonte estás cuidando hoy?",
  elena:
    "El peor escenario realista no es perder el trabajo: es aceptar y que la relación no aguante la distancia. ¿Cuánto tiempo aguantas vivir lejos? ¿Cuánto cuesta volver atrás si la decisión sale mal? Eso es lo que pesa, no el porcentaje del sueldo.",
  rafael:
    "Estás dando por hecho que tu pareja “quiere quedarse”. ¿Han hablado del escenario en el que ambos se mudan? ¿Del escenario en el que tú dices que no? Hay supuestos en cómo nombras esto que están haciendo invisible un camino entero.",
};

const SYNTHESIS = [
  {
    label: "Camino A",
    body: "Aceptas. Ganas trayectoria y respiro económico. Cedes proximidad y la apuesta conjunta en el corto plazo.",
  },
  {
    label: "Camino B",
    body: "Dices que no. Cuidas el proyecto en común. Cedes el salto de ingreso y un horizonte que quizá no se repita pronto.",
  },
  {
    label: "Camino C",
    body: "Negocias condiciones (mudanza parcial, fecha, esquema híbrido). Abres opción, pero pagas tiempo y energía emocional ahora.",
  },
] as const;

const VARS: Record<AgentId, string> = {
  marco: "var(--marco)",
  elena: "var(--elena)",
  rafael: "var(--rafael)",
};

export function ExampleSection() {
  return (
    <section
      id="ejemplo"
      className="border-t border-border/70 py-24 md:py-32"
    >
      <Container>
        <Reveal>
          <header className="mb-14 max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-strong">
              Un caso real
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              Así suena cuando el tiempo aprieta.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground-soft">
              Esto es un ejemplo, no un consejo. Lo que muestra es cómo tres
              miradas a la vez te devuelven matices que, hablándolo solo, se te
              colapsan en un “sí o no”.
            </p>
          </header>
        </Reveal>

        <Reveal delay={80}>
          <div className="overflow-hidden rounded-council-xl border border-border bg-surface shadow-council">
            <div className="flex items-center justify-between border-b border-border/70 px-6 py-3.5">
              <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-foreground-soft">
                <span className="size-1.5 rounded-full bg-accent" />
                Una conversación con tu council
              </div>
              <div className="text-[10px] tabular-nums text-subtle">
                Caso ilustrativo
              </div>
            </div>

            <div className="border-b border-border/70 bg-surface-soft/50 px-6 py-6">
              <p className="text-[10px] uppercase tracking-[0.16em] text-subtle">
                Llegas y dices
              </p>
              <p className="mt-2 max-w-3xl text-[15.5px] leading-relaxed text-foreground">
                {DILEMMA}
              </p>
            </div>

            <div className="grid gap-px bg-border md:grid-cols-3">
              {AGENT_IDS.map((agent, idx) => (
                <Reveal key={agent} delay={120 + idx * 110}>
                  <div className="flex h-full flex-col gap-4 bg-surface p-6">
                    <div className="flex items-center gap-3">
                      <AgentFace agent={agent} size={48} mood="speaking" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {AGENT_LABELS[agent]}
                        </p>
                        <p
                          className="text-[10px] uppercase tracking-[0.16em]"
                          style={{ color: VARS[agent] }}
                        >
                          {AGENT_ROLES[agent]}
                        </p>
                      </div>
                    </div>
                    <p className="text-[14px] leading-relaxed text-foreground-soft">
                      {RESPONSES[agent]}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>

            <div className="border-t border-border/70 bg-gradient-to-br from-surface via-surface-soft/60 to-accent-soft/40 px-6 py-7">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.18em] text-accent-strong">
                  Al final · te devuelven los caminos
                </p>
                <p className="text-[10px] tabular-nums text-subtle">
                  Nadie elige por ti
                </p>
              </div>
              <ul className="mt-4 grid gap-3 md:grid-cols-3">
                {SYNTHESIS.map((s) => (
                  <li
                    key={s.label}
                    className="rounded-council border border-border bg-surface/85 p-4 shadow-soft backdrop-blur"
                  >
                    <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-foreground">
                      {s.label}
                    </p>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-foreground-soft">
                      {s.body}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-5 max-w-2xl text-[13.5px] italic leading-relaxed text-foreground-soft">
                “Ninguno de los tres caminos es óptimo. La pregunta no es cuál
                es mejor, sino qué precio puedes pagar más tiempo sin
                convertirte en alguien que no querías ser.”
              </p>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
