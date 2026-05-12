import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SurveyForm } from "@/components/survey/SurveyForm";

export const metadata = {
  title: "Onboarding · COUNCILia",
};

export default function OnboardingPage() {
  return (
    <main className="min-h-dvh py-16">
      <Container className="max-w-3xl">
        <Link
          href="/"
          className="text-xs uppercase tracking-wider text-muted hover:text-foreground"
        >
          ← Inicio
        </Link>

        <header className="mt-6 mb-12">
          <p className="text-xs font-medium uppercase tracking-widest text-accent">
            Paso previo · 4 preguntas
          </p>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Antes de reunir tu council, necesitamos entender tu contexto.
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">
            Menos de 30 segundos. Cada respuesta cambia, de forma observable,
            cómo se comporta tu council: a qué agente atenúa, qué tono usa, qué
            pregunta dominante ataca primero.
          </p>
        </header>

        <SurveyForm />
      </Container>
    </main>
  );
}
