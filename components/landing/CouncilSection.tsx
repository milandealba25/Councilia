import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { AgentFace } from "@/components/agents/AgentFace";
import {
  AGENT_DOMINANT_QUESTION,
  AGENT_LABELS,
  AGENT_ROLES,
  AGENT_IDS,
  type AgentId,
} from "@/lib/agents/ids";

const AGENT_CARE: Record<AgentId, string> = {
  marco:
    "Cuida tu yo de dentro de dos años. Quiere asegurarse de que la decisión no te aleje en silencio de quien quieres ser.",
  elena:
    "Cuida lo que podrías perder sin darte cuenta. Mira el peor escenario realista sin dramatismo y te pregunta cuánto puedes sostenerlo.",
  rafael:
    "Cuida tu honestidad contigo mismo. Detecta las cosas que estás dando por hechas sin haberlas mirado.",
};

const AGENT_VOICE: Record<AgentId, string> = {
  marco:
    "Si llegas con prisa, te frena con ternura. Si llegas con un sueño grande, te pide pasos concretos para los próximos 30 días.",
  elena:
    "Traduce lo emocional a algo que se puede pesar: qué cuesta, por cuánto tiempo, en qué momento se vuelve insostenible. Sin asustarte.",
  rafael:
    "Una sola pregunta dura por intervención. No te ataca a ti; revisa lo que estás suponiendo sin haberlo verificado.",
};

const AGENT_AVOID: Record<AgentId, string> = {
  marco: "Darte tácticas rápidas · darte la razón · celebrar lo que ya pensaste",
  elena: "Pintarte un cuadro bonito · sonar neutral · hablarte en abstracto",
  rafael: "Repetirse · darte respuestas en vez de preguntas · suavizar lo incómodo",
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
              Quiénes son
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              Tres personas. Tres formas distintas de cuidarte.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground-soft">
              No se llevan bien entre ellos —en el buen sentido—. Cada uno
              cuida algo distinto de ti, y por eso{" "}
              <span className="font-medium text-foreground">
                nunca se ponen de acuerdo a la fuerza
              </span>
              . Cuando los escuchas a los tres, sueles ver lo que solo no
              alcanzas a mirar.
            </p>
          </header>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {AGENT_IDS.map((agent, idx) => (
            <Reveal key={agent} delay={idx * 90}>
              <article className="group relative flex h-full flex-col gap-6 overflow-hidden rounded-council-lg border border-border bg-surface p-7 shadow-soft transition-all duration-500 hover:-translate-y-1 hover:shadow-council-lg">
                <div
                  aria-hidden
                  className="absolute inset-x-0 -top-px h-[3px]"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${AGENT_VAR[agent]}, transparent)`,
                  }}
                />

                <div className="flex items-start justify-between">
                  <AgentFace agent={agent} size={80} mood="calm" />
                  <span className="text-[10px] uppercase tracking-[0.18em] text-subtle">
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

                <Field label="Lo que cuida en ti" color={AGENT_VAR[agent]}>
                  {AGENT_CARE[agent]}
                </Field>

                <Field label="La pregunta que repite" color={AGENT_VAR[agent]}>
                  <span className="italic">
                    “{AGENT_DOMINANT_QUESTION[agent]}”
                  </span>
                </Field>

                <p className="text-[15px] leading-relaxed text-foreground-soft">
                  {AGENT_VOICE[agent]}
                </p>

                <div className="mt-auto border-t border-border/70 pt-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-subtle">
                    Lo que nunca hace
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-foreground-soft">
                    {AGENT_AVOID[agent]}
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
        className="text-[10px] uppercase tracking-[0.16em]"
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
