"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarUploader } from "@/components/auth/AvatarUploader";
import { Button, LinkButton } from "@/components/ui/Button";
import {
  clearAuthSession,
  getValidAuthSession,
  type AuthSession,
} from "@/lib/auth/client";
import { fetchSurveyStatus } from "@/lib/auth/flow";
import { loadUserContext } from "@/lib/survey/storage";

export function AccountPanel() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [hasSurvey, setHasSurvey] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      const current = await getValidAuthSession();
      if (!active) return;
      setSession(current);
      setHasSurvey(!!loadUserContext());
      if (current) {
        const status = await fetchSurveyStatus(current);
        if (active && status?.completed) setHasSurvey(true);
      }
    }

    void loadAccount();
    return () => {
      active = false;
    };
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
      <div className="grid gap-6 lg:grid-cols-[1fr,auto] lg:items-start">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-accent">
            Sesión activa
          </p>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Tu cuenta está lista.
          </h1>
          {session.user.name && (
            <p className="mt-3 text-lg font-medium text-foreground">
              {session.user.name}
            </p>
          )}
          <p className="mt-3 leading-relaxed text-muted">
            {session.user.email}
          </p>
        </div>
      </div>

      <AvatarUploader session={session} onSessionChange={setSession} />

      <div className="flex flex-col gap-3 sm:flex-row">
        {hasSurvey ? (
          <LinkButton href="/session" variant="primary">
            Ir a mis chats
          </LinkButton>
        ) : (
          <LinkButton href="/onboarding" variant="primary">
            Sentarme con ellos
          </LinkButton>
        )}
        <Button type="button" variant="secondary" onClick={handleLogout}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
