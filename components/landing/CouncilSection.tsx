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
  elena: "Pintar optimismo · ‘balancear’ para sonar neutral · hablar en abstracto",
  rafael: "Repetirse · dar respuestas en vez de preguntas · suavizar la incomodidad",
};

const AGENT_THEME: Record<
  AgentId,
  { color: string; soft: string; varColor: string; varSoft: string }
> = {
  marco: {
    color: "text-marco",
    soft: "bg-marco-soft",
    varColor: "var(--marco)",
    varSoft: "var(--marco-soft)",
  },
  elena: {
    color: "text-elena",
    soft: "bg-elena-soft",
    varColor: "var(--elena)",
    varSoft: "var(--elena-soft)",
  },
  rafael: {
    color: "text-rafael",
    soft: "bg-rafael-soft",
    varColor: "var(--rafael)",
    varSoft: "var(--rafael-soft)",
  },
};

export function CouncilSection() {
  return (
    <section
      id="council"
      className="relative border-t border-border/70 py-24 md:py-32"
    >
      <Container>
        <header className="mb-14 max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-widest text-accent-strong">
            01 — El council
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
            Marco, Elena y Rafael.{" "}
            <span className="text-foreground-soft">Tres lentes simultáneas.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground-soft">
            El desacuerdo no emerge de prompts de personalidad. Emerge de{" "}
            <span className="font-medium text-foreground">
              funciones objetivo incompatibles
            </span>
            : posicionamiento de largo plazo, protección del downside y
            cuestionamiento de supuestos. No convergen al consenso.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {AGENT_IDS.map((agent, idx) => {
            const theme = AGENT_THEME[agent];
            return (
              <article
                key={agent}
                className="group relative flex flex-col gap-5 overflow-hidden rounded-council-lg border border-border bg-surface p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-council-lg"
              >
                <div
                  aria-hidden
                  className="absolute inset-x-0 -top-px h-1"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${theme.varColor}, transparent)`,
                  }}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full opacity-60 blur-2xl transition group-hover:opacity-90"
                  style={{ background: theme.varSoft }}
                />

                <div className="relative flex items-center justify-between">
                  <AgentAvatar agent={agent} size={60} />
                  <span className="font-mono text-[11px] uppercase tracking-wider text-subtle">
                    agente · 0{idx + 1}
                  </span>
                </div>

                <div className="relative">
                  <h3 className="font-sans text-xl font-semibold text-foreground">
                    {AGENT_LABELS[agent]}
                  </h3>
                  <p
                    className={`mt-0.5 text-sm font-medium uppercase tracking-wider ${theme.color}`}
                  >
                    {AGENT_ROLES[agent]}
                  </p>
                </div>

                <blockquote
                  className="relative rounded-council border-l-2 px-4 py-3 text-[15px] italic leading-relaxed text-foreground"
                  style={{
                    borderColor: theme.varColor,
                    background: theme.varSoft,
                  }}
                >
                  “{AGENT_DOMINANT_QUESTION[agent]}”
                </blockquote>

                <p className="relative text-sm leading-relaxed text-foreground-soft">
                  {AGENT_PITCH[agent]}
                </p>

                <div className="relative mt-auto border-t border-border/70 pt-4">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-subtle">
                    No hace
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground-soft">
                    {AGENT_NEVER[agent]}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
