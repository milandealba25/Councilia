import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { AgentPortrait } from "@/components/agents/AgentPortrait";
import {
  AGENT_DOMINANT_QUESTION,
  AGENT_LABELS,
  AGENT_ROLES,
  AGENT_IDS,
  type AgentId,
} from "@/lib/agents/ids";

const AGENT_OBJECTIVE: Record<AgentId, string> = {
  marco:
    "Maximiza el posicionamiento óptimo a 2–3 años por encima de la satisfacción inmediata.",
  elena:
    "Minimiza el peor escenario realista y su costo sostenido en el tiempo.",
  rafael:
    "Reduce el número de supuestos no verificados que estás dando por hecho.",
};

const AGENT_PITCH: Record<AgentId, string> = {
  marco:
    "Eleva el horizonte temporal. Si llegas con urgencia, te recuerda los efectos de segundo orden. Si llegas romantizando el largo plazo, te pide pasos verificables a 30 días.",
  elena:
    "Traduce lo cualitativo a magnitudes comparables. Su pregunta no es si vale la pena, sino cuánto cuesta el peor escenario realista y por cuánto tiempo puedes sostenerlo.",
  rafael:
    "Una sola pregunta dura por intervención. Nunca ataca al usuario; ataca al razonamiento. Detecta supuestos que diste por verificados sin verificarlos.",
};

const AGENT_NEVER: Record<AgentId, string> = {
  marco: "Dar tácticas inmediatas · validar al usuario · celebrar lo ya pensado",
  elena: "Pintar optimismo · balancear para sonar neutral · hablar en abstracto",
  rafael: "Repetirse · dar respuestas en vez de preguntas · suavizar la incomodidad",
};

const AGENT_VAR: Record<AgentId, string> = {
  marco: "var(--marco)",
  elena: "var(--elena)",
  rafael: "var(--rafael)",
};

export function CouncilSection() {
  return (
    <section
      id="council"
      className="relative border-t border-border/70 py-24 md:py-32"
    >
      <Container>
        <Reveal>
          <header className="mb-14 max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-strong">
              El council
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              Tres deliberantes. Tres funciones objetivo incompatibles.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground-soft">
              El desacuerdo no emerge de prompts de personalidad. Emerge de{" "}
              <span className="font-medium text-foreground">
                criterios de optimización distintos
              </span>{" "}
              que no pueden satisfacerse al mismo tiempo. Por eso el council
              nunca converge artificialmente.
            </p>
          </header>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {AGENT_IDS.map((agent, idx) => (
            <Reveal key={agent} delay={idx * 90}>
              <article className="group relative flex h-full flex-col gap-6 overflow-hidden rounded-council-lg border border-border bg-surface p-7 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-council-lg">
                <div
                  aria-hidden
                  className="absolute inset-x-0 -top-px h-[3px]"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${AGENT_VAR[agent]}, transparent)`,
                  }}
                />

                <div className="flex items-start justify-between">
                  <AgentPortrait agent={agent} size={72} />
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">
                    0{idx + 1}
                  </span>
                </div>

                <div>
                  <h3 className="font-sans text-xl font-semibold text-foreground">
                    {AGENT_LABELS[agent]}
                  </h3>
                  <p
                    className="mt-0.5 text-[13px] font-medium uppercase tracking-[0.14em]"
                    style={{ color: AGENT_VAR[agent] }}
                  >
                    {AGENT_ROLES[agent]}
                  </p>
                </div>

                <Field label="Función objetivo" color={AGENT_VAR[agent]}>
                  {AGENT_OBJECTIVE[agent]}
                </Field>

                <Field label="Pregunta dominante" color={AGENT_VAR[agent]}>
                  <span className="italic">
                    “{AGENT_DOMINANT_QUESTION[agent]}”
                  </span>
                </Field>

                <p className="text-[15px] leading-relaxed text-foreground-soft">
                  {AGENT_PITCH[agent]}
                </p>

                <div className="mt-auto border-t border-border/70 pt-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
                    No hace
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-foreground-soft">
                    {AGENT_NEVER[agent]}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Field({
  label,
  color,
  children,
}: {
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-l-2 pl-3.5" style={{ borderColor: color }}>
      <p
        className="font-mono text-[10px] uppercase tracking-[0.16em]"
        style={{ color }}
      >
        {label}
      </p>
      <p className="mt-1 text-[14px] leading-relaxed text-foreground">
        {children}
      </p>
    </div>
  );
}
