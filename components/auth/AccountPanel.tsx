"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarUploader } from "@/components/auth/AvatarUploader";
import { Button, LinkButton } from "@/components/ui/Button";
import {
  clearAuthSession,
  loadAuthSession,
  type AuthSession,
} from "@/lib/auth/client";
import { fetchSurveyStatus } from "@/lib/auth/flow";
import { loadUserContext } from "@/lib/survey/storage";

const VOICE_KEY = "councilia.voiceEnabled";

export function AccountPanel() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [hasSurvey, setHasSurvey] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);

  useEffect(() => {
    const current = loadAuthSession();
    setSession(current);
    setHasSurvey(!!loadUserContext());
    setVoiceOn(localStorage.getItem(VOICE_KEY) !== "false");
    if (current) {
      void fetchSurveyStatus(current).then((status) => {
        if (status?.completed) setHasSurvey(true);
      });
    }
  }, []);

  function handleLogout() {
    clearAuthSession();
    router.push("/" as never);
  }

  function handleToggleVoice() {
    const next = !voiceOn;
    setVoiceOn(next);
    localStorage.setItem(VOICE_KEY, String(next));
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
          <p className="mt-3 leading-relaxed text-muted">{session.user.email}</p>
        </div>
      </div>

      <AvatarUploader session={session} onSessionChange={setSession} />

      {/* Preferencias */}
      <div className="rounded-lg border border-border bg-elevated/40 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted">
          Preferencias
        </p>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Voz de los agentes
            </p>
            <p className="text-xs text-muted">
              {voiceOn
                ? "Los agentes hablan después de escribir."
                : "Los agentes solo escriben, sin audio."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={voiceOn}
            onClick={handleToggleVoice}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
              voiceOn ? "bg-accent" : "bg-border"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                voiceOn ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

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
