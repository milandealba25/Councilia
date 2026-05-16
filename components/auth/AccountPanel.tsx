"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, LinkButton } from "@/components/ui/Button";
import {
  clearAuthSession,
  loadAuthSession,
  type AuthSession,
} from "@/lib/auth/client";

export function AccountPanel() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    setSession(loadAuthSession());
  }, []);

  function handleLogout() {
    clearAuthSession();
    router.push("/" as never);
  }

  if (!session) {
    return (
      <div className="grid gap-5 rounded-council-lg border border-border/70 bg-surface/70 p-6 shadow-council md:p-8">
        <p className="text-muted">Todavía no hay una sesión activa.</p>
        <LinkButton href="/login" variant="primary">
          Entrar
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="grid gap-5 rounded-council-lg border border-border/70 bg-surface/70 p-6 shadow-council md:p-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-accent">
          Sesión activa
        </p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Tu cuenta está lista.
        </h1>
        <p className="mt-3 leading-relaxed text-muted">{session.user.email}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <LinkButton href="/onboarding" variant="primary">
          Nueva sesión
        </LinkButton>
        <Button type="button" variant="secondary" onClick={handleLogout}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
