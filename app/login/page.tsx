import Link from "next/link";
import { Suspense } from "react";
import { AgentFace } from "@/components/agents/AgentFace";
import { LoginForm } from "@/components/auth/LoginForm";
import { Container } from "@/components/ui/Container";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { AGENT_IDS } from "@/lib/agents/ids";

export const metadata = {
  title: "Login · COUNCILia",
};

export default function LoginPage() {
  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <AuroraBackground />
      <Container className="relative z-10 w-full max-w-xl">
        <Link
          href="/"
          className="text-xs uppercase tracking-wider text-muted hover:text-foreground"
        >
          ← Inicio
        </Link>

        <div className="mt-8 grid gap-7">
          <header className="text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-accent">
              Acceso
            </p>
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Entra para que el council recuerde lo importante.
            </h1>
            <p className="mx-auto mt-4 max-w-lg leading-relaxed text-muted">
              Usa tu correo y contraseña, o entra con Google si prefieres
              resolverlo en un toque.
            </p>
          </header>

          <section
            className="rounded-council-lg border border-border/70 bg-surface/70 p-5 shadow-council md:p-6"
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

          <div
            className="flex items-center justify-center gap-4 pt-1"
            aria-hidden
          >
            {AGENT_IDS.map((id, i) => (
              <span
                key={id}
                style={{
                  animation: `soft-rise 700ms ease-out ${220 + i * 140}ms both`,
                }}
              >
                <AgentFace agent={id} size={58} mood="listening" />
              </span>
            ))}
          </div>
        </div>
      </Container>
    </main>
  );
}
