import Link from "next/link";
import { Suspense } from "react";
import { AuthCallback } from "@/components/auth/AuthCallback";
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Confirmando login",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthCallbackPage() {
  return (
    <main className="min-h-dvh py-16">
      <Container className="max-w-2xl">
        <Link
          href="/"
          className="text-xs uppercase tracking-wider text-muted hover:text-foreground"
        >
          ← Inicio
        </Link>
        <div className="mt-10">
          <Suspense
            fallback={
              <div className="rounded-council-lg border border-border/70 bg-surface/70 p-6 text-muted shadow-council">
                Confirmando sesión…
              </div>
            }
          >
            <AuthCallback />
          </Suspense>
        </div>
      </Container>
    </main>
  );
}
