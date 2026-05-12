import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <Container className="relative pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-elevated/60 px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted">
            <span className="size-1.5 rounded-full bg-accent" />
            MVP v1.1 · en construcción
          </span>
          <h1 className="mt-6 text-balance font-sans text-4xl font-semibold leading-[1.05] tracking-tight text-foreground md:text-6xl">
            Tres voces que no te van a dar la razón.
          </h1>
          <p className="mt-6 max-w-2xl text-balance text-lg leading-relaxed text-muted md:text-xl">
            COUNCILia reúne un{" "}
            <span className="text-foreground">council deliberativo</span> con
            funciones objetivo incompatibles. No te da una recomendación: te
            devuelve los tradeoffs visibles para que <em>tú</em> decidas.
          </p>

          <div id="empezar" className="mt-10 flex flex-wrap items-center gap-3">
            <LinkButton href="/onboarding" variant="primary">
              Reunir mi council
              <Arrow />
            </LinkButton>
            <LinkButton href="#council" variant="secondary">
              Conoce a los 3 agentes
            </LinkButton>
          </div>

          <dl className="mt-14 grid max-w-2xl grid-cols-3 gap-6 border-t border-border/60 pt-8 text-sm">
            <Stat label="agentes" value="3" caption="funciones objetivo incompatibles" />
            <Stat label="streaming" value="<1.5s" caption="tiempo al primer token" />
            <Stat label="recomendaciones" value="0" caption="solo nombra tradeoffs" />
          </dl>
        </div>

        <BackgroundGrid />
      </Container>
    </section>
  );
}

function Stat({
  value,
  label,
  caption,
}: {
  value: string;
  label: string;
  caption: string;
}) {
  return (
    <div>
      <dd className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </dd>
      <dt className="mt-1 text-xs uppercase tracking-wider text-muted">
        {label}
      </dt>
      <p className="mt-1 text-xs text-muted/80">{caption}</p>
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

function BackgroundGrid() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 opacity-[0.18]"
      style={{
        backgroundImage:
          "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
        backgroundSize: "56px 56px",
        maskImage:
          "radial-gradient(ellipse 60% 50% at 50% 0%, black 30%, transparent 80%)",
      }}
    />
  );
}
