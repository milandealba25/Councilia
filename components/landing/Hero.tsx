import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <BackgroundOrbs />
      <Container className="relative pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border-strong/70 bg-surface/80 px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider text-foreground-soft shadow-soft backdrop-blur">
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" />
                <span className="relative size-2 rounded-full bg-accent" />
              </span>
              MVP v1.1 · en construcción
            </span>

            <h1 className="mt-6 text-balance font-sans text-5xl font-semibold leading-[1.02] tracking-tight text-foreground md:text-[4.25rem]">
              Tres voces que{" "}
              <span className="relative inline-block">
                <span className="relative z-10">no te van a</span>
                <span
                  aria-hidden
                  className="absolute inset-x-0 -bottom-1 -z-0 h-3 rounded-sm bg-elena/40 md:h-4"
                />
              </span>{" "}
              dar la razón.
            </h1>

            <p className="mt-7 max-w-xl text-balance text-lg leading-relaxed text-foreground-soft md:text-xl">
              COUNCILia reúne un{" "}
              <span className="font-medium text-foreground">
                council deliberativo
              </span>{" "}
              con funciones objetivo incompatibles. No te da una recomendación:
              te devuelve los tradeoffs visibles para que{" "}
              <em className="not-italic font-medium text-accent-strong">
                tú
              </em>{" "}
              decidas.
            </p>

            <div
              id="empezar"
              className="mt-10 flex flex-wrap items-center gap-3"
            >
              <LinkButton href="/onboarding" variant="primary">
                Reunir mi council
                <Arrow />
              </LinkButton>
              <LinkButton href="#council" variant="secondary">
                Conoce a los 3 agentes
              </LinkButton>
            </div>

            <dl className="mt-14 grid max-w-xl grid-cols-3 gap-6 border-t border-border-strong/40 pt-8 text-sm">
              <Stat
                value="3"
                label="agentes"
                caption="funciones objetivo incompatibles"
              />
              <Stat
                value={<>&lt;1.5s</>}
                label="streaming"
                caption="tiempo al primer token"
              />
              <Stat
                value="0"
                label="recomendaciones"
                caption="solo nombra tradeoffs"
              />
            </dl>
          </div>

          <CouncilOrb />
        </div>
      </Container>
    </section>
  );
}

function Stat({
  value,
  label,
  caption,
}: {
  value: React.ReactNode;
  label: string;
  caption: string;
}) {
  return (
    <div>
      <dd className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </dd>
      <dt className="mt-1 text-xs uppercase tracking-wider text-foreground-soft">
        {label}
      </dt>
      <p className="mt-1 text-xs text-subtle">{caption}</p>
    </div>
  );
}

function Arrow() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function CouncilOrb() {
  const agents = [
    {
      id: "marco",
      label: "Marco",
      role: "Estratega",
      question: "¿Qué te quita opciones a 3 años?",
      color: "var(--marco)",
      softBg: "var(--marco-soft)",
    },
    {
      id: "elena",
      label: "Elena",
      role: "Riesgo",
      question: "¿Cuánto cuesta el peor escenario?",
      color: "var(--elena)",
      softBg: "var(--elena-soft)",
    },
    {
      id: "rafael",
      label: "Rafael",
      role: "Crítico",
      question: "¿Qué supuesto estás dando por verificado?",
      color: "var(--rafael)",
      softBg: "var(--rafael-soft)",
    },
  ] as const;

  return (
    <div className="relative mx-auto hidden h-[460px] w-full max-w-md lg:block">
      <div
        aria-hidden
        className="absolute inset-0 rounded-full bg-warm-mesh opacity-90 blur-2xl"
      />
      <div className="absolute inset-6 rounded-council-xl border border-border-strong/40 bg-surface/70 shadow-council-lg backdrop-blur">
        <div className="absolute -top-3 left-6 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-foreground-soft shadow-soft ring-1 ring-border-strong/60">
          <span className="size-1.5 rounded-full bg-accent" />
          Sesión en vivo
        </div>

        <ul className="flex h-full flex-col justify-center gap-3 p-6">
          {agents.map((a, idx) => (
            <li
              key={a.id}
              className="group relative flex items-start gap-3 rounded-council border border-border-strong/30 bg-surface/85 p-3 shadow-soft transition hover:-translate-y-px hover:shadow-council"
              style={{
                animation: `float 6s ease-in-out ${idx * 0.6}s infinite`,
              }}
            >
              <span
                className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold"
                style={{
                  background: a.softBg,
                  color: a.color,
                  boxShadow: `0 0 0 1px ${a.color}40 inset`,
                }}
              >
                {a.label.charAt(0)}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-foreground">
                    {a.label}
                  </span>
                  <span
                    className="rounded-full px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider"
                    style={{ background: a.softBg, color: a.color }}
                  >
                    {a.role}
                  </span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-foreground-soft">
                  “{a.question}”
                </p>
              </div>
              <TypingDots color={a.color} />
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

function TypingDots({ color }: { color: string }) {
  return (
    <span className="ml-auto inline-flex items-end gap-0.5 self-end">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block size-1 rounded-full"
          style={{
            background: color,
            opacity: 0.85,
            animation: `pulse 1.2s ease-in-out ${i * 0.18}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
          40% { transform: translateY(-2px); opacity: 1; }
        }
      `}</style>
    </span>
  );
}

function BackgroundOrbs() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 size-[480px] rounded-full bg-accent/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-40 -left-32 size-[420px] rounded-full bg-elena/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/3 size-[360px] rounded-full bg-marco/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(var(--border-strong) 1px, transparent 1px), linear-gradient(90deg, var(--border-strong) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 0%, black 30%, transparent 80%)",
        }}
      />
    </>
  );
}
