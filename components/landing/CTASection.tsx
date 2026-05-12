import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";

export function CTASection() {
  return (
    <section className="border-t border-border/60 py-24 md:py-28">
      <Container>
        <div className="relative overflow-hidden rounded-council border border-border bg-elevated/70 p-10 md:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-accent/15 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-tension/10 blur-3xl"
          />

          <div className="relative max-w-2xl">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Antes de reunir tu council, necesitamos entender tu contexto.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              Cuatro preguntas. Menos de 30 segundos. Cada respuesta cambia, de
              forma observable, cómo se comporta tu council durante la sesión.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
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
