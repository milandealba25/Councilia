import Link from "next/link";
import { Suspense } from "react";
import { AgentFace } from "@/components/agents/AgentFace";
import { LoginForm } from "@/components/auth/LoginForm";
import { Container } from "@/components/ui/Container";
import { AGENT_IDS } from "@/lib/agents/ids";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Iniciar sesión",
  description: "Acceso seguro a tu cuenta de COUNCILia.",
  path: "/login",
  index: false,
});

export default function LoginPage() {
  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden px-4 py-[clamp(1.25rem,4vh,2.75rem)]">
      <Container className="relative z-10 grid w-full max-w-[40rem] gap-[clamp(0.75rem,1.8vh,1.2rem)]">
        <div className="relative flex min-h-[clamp(2rem,5vh,2.5rem)] items-center justify-center">
          <Link
            href="/"
            className="absolute -top-1 left-0 text-xs uppercase tracking-wider text-muted transition hover:text-foreground"
          >
            ← Inicio
          </Link>

          <div className="flex items-center justify-center gap-2.5" aria-hidden>
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
        </div>

        <div className="grid gap-[clamp(0.75rem,1.8vh,1.25rem)]">
          <header className="text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-accent">
              Acceso
            </p>
            <h1 className="mx-auto mt-2 max-w-[34rem] text-balance text-[clamp(1.65rem,3.8vmin,2.05rem)] font-semibold leading-[1.12] tracking-tight text-foreground">
              Entra para que el council recuerde lo importante.
            </h1>
          </header>

          <section
            className="rounded-[clamp(1.1rem,2.8vmin,1.5rem)] border border-border/70 bg-surface/76 p-[clamp(1.05rem,2.2vmin,1.45rem)] shadow-council"
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
