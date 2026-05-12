import { Container } from "@/components/ui/Container";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import {
  AGENT_DOMINANT_QUESTION,
  AGENT_LABELS,
  AGENT_ROLES,
  AGENT_IDS,
  type AgentId,
} from "@/lib/agents/ids";

const AGENT_PITCH: Record<AgentId, string> = {
  marco:
    "Eleva el horizonte temporal. Si llegas con urgencia, te recuerda los efectos de segundo orden. Si llegas romantizando el largo plazo, te pide pasos verificables a 30 días.",
  elena:
    "Traduce lo cualitativo a magnitudes comparables. Su pregunta no es si vale la pena, sino cuánto cuesta el peor escenario realista y por cuánto tiempo puedes sostenerlo.",
  rafael:
    "Una pregunta dura por intervención. Nunca ataca al usuario; ataca al razonamiento. Detecta los supuestos que diste por verificados sin verificarlos.",
};

const AGENT_NEVER: Record<AgentId, string> = {
  marco: "Dar tácticas inmediatas · validar al usuario · celebrar lo ya pensado",
  elena: "Pintar optimismo · 'balancear' para sonar neutral · hablar en abstracto",
  rafael: "Repetirse · dar respuestas en vez de preguntas · suavizar la incomodidad",
};

export function CouncilSection() {
  return (
    <section id="council" className="border-t border-border/60 py-24 md:py-32">
      <Container>
        <header className="mb-14 max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-widest text-accent">
            01 — El council
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Marco, Elena y Rafael.{" "}
            <span className="text-muted">Tres lentes simultáneas.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            El desacuerdo no emerge de prompts de personalidad. Emerge de{" "}
            <span className="text-foreground">funciones objetivo incompatibles</span>:
            posicionamiento de largo plazo, protección del downside y
            cuestionamiento de supuestos. No convergen al consenso.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-3">
          {AGENT_IDS.map((agent) => (
            <article
              key={agent}
              className="group flex flex-col gap-5 rounded-council border border-border bg-elevated/70 p-6 transition hover:border-accent-muted/70 hover:bg-elevated"
            >
              <div className="flex items-center justify-between">
                <AgentAvatar agent={agent} size={56} />
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
                  agente · 0{AGENT_IDS.indexOf(agent) + 1}
                </span>
              </div>

              <div>
                <h3 className="font-sans text-xl font-semibold text-foreground">
                  {AGENT_LABELS[agent]}
                </h3>
                <p className="mt-0.5 text-sm uppercase tracking-wider text-muted">
                  {AGENT_ROLES[agent]}
                </p>
              </div>

              <blockquote className="border-l-2 border-accent-muted/50 pl-4 text-sm italic leading-relaxed text-foreground/85">
                “{AGENT_DOMINANT_QUESTION[agent]}”
              </blockquote>

              <p className="text-sm leading-relaxed text-muted">
                {AGENT_PITCH[agent]}
              </p>

              <div className="mt-auto border-t border-border/60 pt-4">
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted/80">
                  No hace
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {AGENT_NEVER[agent]}
                </p>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
