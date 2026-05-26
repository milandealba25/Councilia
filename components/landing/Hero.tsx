import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { CouncilHeroPanel } from "@/components/landing/CouncilHeroPanel";
import { StartAccessButton } from "@/components/landing/StartAccessButton";

export function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden">
      <HeroGrid />
      <Container className="relative pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="flex flex-col gap-7 lg:gap-7">
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

            <Reveal delay={110}>
              <p className="mt-5 max-w-2xl text-balance text-base font-medium leading-relaxed text-foreground md:text-lg">
                Una app de IA para pensar decisiones difíciles con tres
                perspectivas críticas: largo plazo, riesgo y supuestos.
              </p>
            </Reveal>
          </div>

          <div className="grid gap-16 lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-x-16">
            <div>
              <Reveal delay={140}>
                <p className="max-w-xl text-balance text-lg leading-relaxed text-foreground-soft md:text-xl">
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
                  id="hero-cta"
                  className="mt-10 flex flex-wrap items-center gap-3"
                >
                  <StartAccessButton>
                    Sentarme con ellos
                  </StartAccessButton>
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

            <Reveal delay={120} className="w-full">
              <CouncilHeroPanel />
            </Reveal>
          </div>
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

function HeroGrid() {
  return (
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
  );
}
