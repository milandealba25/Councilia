import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SessionConsole } from "@/components/session/SessionConsole";

export const metadata = {
  title: "Sesión · COUNCILia",
};

export default function SessionPage() {
  return (
    <main className="min-h-dvh py-12">
      <Container className="max-w-5xl">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-xs uppercase tracking-wider text-muted hover:text-foreground"
          >
            ← Inicio
          </Link>
          <Link
            href="/onboarding"
            className="text-xs uppercase tracking-wider text-muted hover:text-foreground"
          >
            Reiniciar encuesta
          </Link>
        </div>

        <header className="mt-8 mb-10">
          <p className="text-xs font-medium uppercase tracking-widest text-accent">
            Sesión activa
          </p>
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Marco, Elena y Rafael están a tu mesa.
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">
            Sin emojis, sin recomendaciones, sin felicitaciones. Una pregunta dura
            por turno y una sola réplica selectiva entre el par con mayor
            contradicción.
          </p>
        </header>

        <SessionConsole />
      </Container>
    </main>
  );
}
