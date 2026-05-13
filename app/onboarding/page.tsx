import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SurveyForm } from "@/components/survey/SurveyForm";
import { AgentFace } from "@/components/agents/AgentFace";
import { AGENT_IDS } from "@/lib/agents/ids";

export const metadata = {
  title: "Antes de sentarnos · COUNCILia",
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
          <div className="mb-6 flex items-center gap-3">
            {AGENT_IDS.map((id, i) => (
              <span
                key={id}
                style={{
                  animation: `soft-rise 700ms ease-out ${i * 140}ms both`,
                }}
              >
                <AgentFace agent={id} size={48} mood="listening" />
              </span>
            ))}
          </div>
          <p className="text-xs font-medium uppercase tracking-widest text-accent">
            Cuatro preguntas · menos de un minuto
          </p>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Antes de sentarnos, queremos saber quién llega.
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">
            No es un test. Son cuatro preguntas suaves para que la conversación
            te encuentre en el momento en que estás: con prisa o tomándotelo
            con calma, buscando que te confronten o que te ayuden a poner
            orden. Tus respuestas no se comparten con nadie.
          </p>
        </header>

        <SurveyForm />
      </Container>
    </main>
  );
}
