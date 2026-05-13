import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";

export function CTASection() {
  return (
    <section className="border-t border-border/70 py-24 md:py-28">
      <Container>
        <div className="relative overflow-hidden rounded-council-xl border border-border bg-gradient-to-br from-surface via-surface-soft to-accent-soft p-10 shadow-council-lg md:p-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-32 size-[420px] rounded-full bg-accent/25 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -left-20 size-[380px] rounded-full bg-elena/25 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-10 right-1/4 size-[280px] rounded-full bg-marco/20 blur-3xl"
          />

          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border-strong/60 bg-surface/90 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-foreground-soft shadow-soft">
              <span className="size-1.5 rounded-full bg-accent" />
              30 segundos · 4 preguntas
            </span>

            <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              Antes de reunir tu council, necesitamos entender tu contexto.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-foreground-soft">
              Cada respuesta cambia, de forma observable, cómo se comporta tu
              council durante la sesión. Sin cuenta, sin pago, sin obstáculos.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <LinkButton href="/onboarding" variant="primary">
                Empezar la encuesta
              </LinkButton>
              <LinkButton
                href="https://github.com/Councilia/Councilia/tree/main/docs"
                variant="secondary"
                external
              >
                Leer la documentación
              </LinkButton>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
