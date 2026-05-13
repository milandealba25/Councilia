import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { AgentFace } from "@/components/agents/AgentFace";
import {
  AGENT_LABELS,
  AGENT_ROLES,
  AGENT_IDS,
  type AgentId,
} from "@/lib/agents/ids";

const WHISPERS: Record<AgentId, string> = {
  marco: "Pienso en quién serás dentro de dos años si dices que sí.",
  elena: "Imaginemos lo peor con calma, y veamos cuánto duele.",
  rafael: "¿Y si hay algo que aún no te has atrevido a preguntar?",
};

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <BackgroundOrbs />
      <Container className="relative pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-border-strong/70 bg-surface/80 px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-foreground-soft shadow-soft backdrop-blur">
                <span className="size-1.5 rounded-full bg-accent" />
                Para decisiones que pesan
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-7 text-balance font-sans text-[2.75rem] font-semibold leading-[1.04] tracking-tight text-foreground md:text-[4.25rem]">
                Tres voces que no te van a dar la razón.
              </h1>
            </Reveal>

            <Reveal delay={140}>
              <p className="mt-7 max-w-xl text-balance text-lg leading-relaxed text-foreground-soft md:text-xl">
                A veces no necesitas una respuesta más. Necesitas que alguien te
                ayude a ver lo que estás cargando.{" "}
                <span className="text-foreground">
                  Te sentamos con tres personas
                </span>{" "}
                que te escuchan en serio, te muestran lo que evades sin
                regañarte, y te devuelven la decisión.
              </p>
            </Reveal>

            <Reveal delay={200}>
              <div
                id="empezar"
                className="mt-10 flex flex-wrap items-center gap-3"
              >
                <LinkButton href="/onboarding" variant="primary">
                  Sentarme con ellos
                </LinkButton>
                <LinkButton href="#council" variant="secondary">
                  Conocer a Marco, Elena y Rafael
                </LinkButton>
              </div>
            </Reveal>

            <Reveal delay={260}>
              <dl className="mt-14 grid max-w-xl grid-cols-3 gap-6 border-t border-border-strong/40 pt-8 text-sm">
                <Stat
                  value="3"
                  label="Voces"
                  caption="Que no se ponen de acuerdo y te ayudan a ver claro"
                />
                <Stat
                  value="Tú"
                  label="Decides"
                  caption="Nadie te dice qué hacer, ni siquiera al final"
                />
                <Stat
                  value="0"
                  label="Empujones"
                  caption="Ningún consejo disfrazado de respuesta"
                />
              </dl>
            </Reveal>
          </div>

          <Reveal delay={120} className="w-full lg:self-end">
            <CouncilPanel />
          </Reveal>
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
      <dd className="font-sans text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </dd>
      <dt className="mt-1 text-xs uppercase tracking-[0.14em] text-foreground-soft">
        {label}
      </dt>
      <p className="mt-1 text-xs text-subtle">{caption}</p>
    </div>
  );
}

function CouncilPanel() {
  return (
    <div className="relative mx-auto hidden h-full w-full max-w-md lg:block">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -m-6 rounded-council-xl opacity-90 blur-2xl"
        style={{
          background:
            "radial-gradient(900px 500px at 80% 10%, rgb(226 96 59 / 0.2), transparent 60%), radial-gradient(800px 480px at 10% 30%, rgb(217 154 43 / 0.2), transparent 65%)",
        }}
      />

      <div className="relative overflow-hidden rounded-council-xl border border-border-strong/40 bg-surface/85 shadow-council-lg backdrop-blur">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-foreground-soft">
            <span className="size-1.5 rounded-full bg-accent" />
            Tu council, en silencio
          </div>
          <div className="text-[10px] tabular-nums text-subtle">
            Te están escuchando
          </div>
        </div>

        <ul className="flex flex-col">
          {AGENT_IDS.map((agent, idx) => (
            <li
              key={agent}
              className="flex items-start gap-4 border-b border-border/60 px-5 py-5 last:border-b-0"
              style={{
                animation: `soft-rise 700ms ease-out ${idx * 160}ms both`,
              }}
            >
              <AgentFace agent={agent} size={56} mood="listening" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {AGENT_LABELS[agent]}
                  </span>
                  <span
                    className="text-[10px] uppercase tracking-[0.16em]"
                    style={{
                      color: `var(--${agent})`,
                    }}
                  >
                    {AGENT_ROLES[agent]}
                  </span>
                </div>
                <p className="mt-1.5 text-[13.5px] italic leading-relaxed text-foreground-soft">
                  “{WHISPERS[agent]}”
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 border-t border-border/70 bg-surface-soft/60 px-5 py-3.5">
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-surface ring-1 ring-border-strong/70 text-[11px] text-foreground-soft">
            Tú
          </span>
          <Link
            href="/onboarding"
            className="flex-1 text-left text-sm text-foreground-soft transition-colors hover:text-accent-strong"
          >
            Cuéntales lo que te tiene así…
          </Link>
        </div>
      </div>
    </div>
  );
}

function BackgroundOrbs() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-32 size-[520px] rounded-full bg-accent/22 blur-3xl"
        style={{ animation: "face-float 12s ease-in-out infinite" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-32 -left-40 size-[460px] rounded-full bg-elena/18 blur-3xl"
        style={{ animation: "face-float 14s ease-in-out 1.5s infinite" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]"
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
