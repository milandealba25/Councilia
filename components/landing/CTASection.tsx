import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export function CTASection() {
  return (
    <section className="border-t border-border/70 py-24 md:py-32">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-council-xl border border-border bg-gradient-to-br from-surface via-surface-soft to-accent-soft/70 p-10 shadow-council-lg md:p-16">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-32 size-[420px] rounded-full bg-accent/22 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-32 -left-24 size-[380px] rounded-full bg-elena/22 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-10 right-1/4 size-[260px] rounded-full bg-marco/18 blur-3xl"
            />

            <div className="relative max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.18em] text-accent-strong">
                Cinco preguntas · menos de un minuto
              </p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
                Antes de sentarte con ellos, queremos saber quién llega.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-foreground-soft">
                Cinco preguntas suaves. Con eso ajustamos el tono, el ritmo y
                qué cuida cada voz contigo. Sin cuenta, sin pago, sin
                obstáculos.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <LinkButton href="/onboarding" variant="primary">
                  Empezar a hablar
                </LinkButton>
                <LinkButton href="#ejemplo" variant="secondary">
                  Ver primero un ejemplo
                </LinkButton>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
