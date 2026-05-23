import Link from "next/link";
import { Suspense } from "react";
import { AgentFace } from "@/components/agents/AgentFace";
import { LoginForm } from "@/components/auth/LoginForm";
import { Container } from "@/components/ui/Container";
import { AGENT_IDS } from "@/lib/agents/ids";

export const metadata = {
  title: "Iniciar sesión",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden px-4 py-8 md:py-10">
      <Container className="relative z-10 w-full max-w-xl">
        <Link
          href="/"
          className="text-xs uppercase tracking-wider text-muted hover:text-foreground"
        >
          ← Inicio
        </Link>

        <div className="mt-7 grid gap-6">
          <header className="text-center">
            <div
              className="mb-4 flex items-center justify-center gap-2.5"
              aria-hidden
            >
              {AGENT_IDS.map((id, i) => (
                <span
                  key={id}
                  style={{
                    animation: `soft-rise 650ms ease-out ${i * 110}ms both`,
                  }}
                >
                  <AgentFace agent={id} size={40} mood="listening" />
                </span>
              ))}
            </div>
            <p className="text-xs font-medium uppercase tracking-widest text-accent">
              Acceso
            </p>
            <h1 className="mx-auto mt-3 max-w-lg text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Entra para que el council recuerde lo importante.
            </h1>
            <p className="mx-auto mt-4 max-w-lg leading-relaxed text-muted">
              Usa tu correo y contraseña, o entra con Google si prefieres
              resolverlo en un toque.
            </p>
          </header>

          <section
            className="rounded-council-lg border border-border/70 bg-surface/76 p-5 shadow-council md:p-6"
            style={{ animation: "soft-rise 600ms ease-out 120ms both" }}
          >
            <Suspense
              fallback={
                <p className="text-sm text-muted">Preparando acceso…</p>
              }
            >
              <LoginForm />
            </Suspense>
          </section>
        </div>
      </Container>
    </main>
  );
}
