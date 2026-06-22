"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarUploader } from "@/components/auth/AvatarUploader";
import { BillingPanel } from "@/components/billing/BillingPanel";
import { Button, LinkButton } from "@/components/ui/Button";
import {
  clearAuthSession,
  getValidAuthSession,
  loadAuthSession,
  updateAuthUser,
  type AuthSession,
} from "@/lib/auth/client";
import { fetchSurveyStatus } from "@/lib/auth/flow";
import { isValidName, sanitizeName } from "@/lib/auth/validation";
import { loadUserContext } from "@/lib/survey/storage";
import {
  loadVoiceEnabled,
  saveVoiceEnabled,
} from "@/lib/preferences/voice";

type SaveState = "idle" | "saving";

export function AccountPanel() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [hasSurvey, setHasSurvey] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [userPlan, setUserPlan] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      const current = await getValidAuthSession();
      if (!active) return;
      setSession(current);
      setNameInput(current?.user.name ?? "");
      setHasSurvey(!!loadUserContext());
      setVoiceEnabled(loadVoiceEnabled());
      if (current) {
        const status = await fetchSurveyStatus(current);
        if (active && status?.completed) setHasSurvey(true);

        try {
          const billingRes = await fetch("/api/billing/status", {
            headers: { authorization: `Bearer ${current.accessToken}` },
            cache: "no-store",
          });
          if (billingRes.ok) {
            const billing = await billingRes.json() as { plan?: string };
            if (active && billing.plan) setUserPlan(billing.plan);
          }
        } catch {}
      }
    }

    void loadAccount();
    return () => {
      active = false;
    };
  }, []);

  const sanitizedName = useMemo(() => sanitizeName(nameInput), [nameInput]);
  const canSaveName =
    isValidName(sanitizedName) &&
    sanitizedName !== sanitizeName(session?.user.name ?? "") &&
    saveState !== "saving";

  function handleLogout() {
    clearAuthSession();
    router.push("/" as never);
  }

  function startEditingName() {
    setNameInput(session?.user.name ?? "");
    setIsEditingName(true);
    setMessage(null);
    setError(null);
  }

  function cancelEditingName() {
    setNameInput(session?.user.name ?? "");
    setIsEditingName(false);
    setError(null);
  }

  async function saveName() {
    if (!canSaveName) return;

    setSaveState("saving");
    setMessage(null);
    setError(null);

    try {
      const currentSession = loadAuthSession();
      if (!currentSession) {
        throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
      }

      const response = await fetch("/api/auth/user", {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${currentSession.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ name: sanitizedName }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        user?: { name?: string | null };
      } | null;

      if (!response.ok || !data?.user?.name) {
        throw new Error(data?.error ?? "No pudimos guardar tu nombre.");
      }

      const nextSession = updateAuthUser({ name: data.user.name });
      if (nextSession) {
        setSession(nextSession);
        setNameInput(data.user.name);
      }
      setIsEditingName(false);
      setMessage("Nombre actualizado.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos guardar tu nombre. Inténtalo de nuevo.",
      );
    } finally {
      setSaveState("idle");
    }
  }

  if (!session) {
    return (
      <div className="grid gap-5 rounded-[1.35rem] border border-[#dfc9b7]/75 bg-[#fff8f0]/82 p-6 shadow-[0_22px_70px_rgba(117,75,46,0.12)] backdrop-blur-xl md:p-8">
        <p className="text-muted">Todavía no hay una sesión activa.</p>
        <LinkButton href="/login" variant="primary">
          Entrar
        </LinkButton>
      </div>
    );
  }

  const displayName = session.user.name ?? "Sin nombre";

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[1.6rem] border border-[#e2cdbb]/80 bg-[#fff8f0]/78 shadow-[0_26px_90px_rgba(116,68,43,0.14)] backdrop-blur-2xl">
        <div className="relative border-b border-[#e2cdbb]/65 bg-[linear-gradient(135deg,rgba(255,247,239,0.96),rgba(250,236,222,0.84),rgba(255,248,240,0.94))] p-6 pb-8 md:p-8 md:pb-10 lg:min-h-72 lg:pr-64">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Perfil activo
            </p>
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              Tu espacio está listo.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted md:text-lg">
              Ajusta cómo te ve Councilia y mantén tu cuenta reconocible en cada
              conversación.
            </p>
          </div>

          <div className="mt-8 flex justify-center lg:absolute lg:right-10 lg:top-8 lg:mt-0">
            <AvatarUploader
              session={session}
              onSessionChange={setSession}
              variant="floating"
            />
          </div>
        </div>

        <div className="grid gap-5 p-6 md:p-8">
          <div className="grid gap-5">
            <section className="rounded-[1.2rem] border border-[#e2cdbb]/72 bg-white/42 p-5 shadow-soft backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Datos de cuenta
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Tu correo no se puede editar desde aquí, pero sí puedes
                    cambiar tu nombre visible.
                  </p>
                </div>
                {!isEditingName && (
                  <button
                    type="button"
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-[#dfc9b7]/80 bg-[#fffaf4]/85 text-[#7c5848] shadow-soft transition hover:-translate-y-0.5 hover:border-accent/45 hover:text-accent-strong"
                    aria-label="Editar nombre"
                    onClick={startEditingName}
                  >
                    <EditIcon />
                  </button>
                )}
              </div>

              <div className="mt-5 grid gap-4">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9d7a69]">
                    Nombre visible
                  </span>
                  {isEditingName ? (
                    <input
                      value={nameInput}
                      onChange={(event) => {
                        setNameInput(event.target.value);
                        setError(null);
                        setMessage(null);
                      }}
                      maxLength={80}
                      className="h-12 rounded-[0.9rem] border border-[#d9b89e] bg-[#fffaf4]/95 px-4 text-base text-foreground shadow-inner outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                      placeholder="Tu nombre"
                      autoFocus
                    />
                  ) : (
                    <span className="rounded-[0.9rem] border border-[#ead8c8]/85 bg-[#fffaf4]/72 px-4 py-3 text-base font-medium text-foreground">
                      {displayName}
                    </span>
                  )}
                </label>

                <div className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9d7a69]">
                    Correo
                  </span>
                  <span className="rounded-[0.9rem] border border-[#ead8c8]/85 bg-[#fffaf4]/55 px-4 py-3 text-base text-muted">
                    {session.user.email}
                  </span>
                </div>

                {isEditingName && (
                  <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                    <Button
                      type="button"
                      variant="primary"
                      className="px-4"
                      disabled={!canSaveName}
                      onClick={saveName}
                    >
                      {saveState === "saving" ? "Guardando..." : "Guardar nombre"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-4"
                      disabled={saveState === "saving"}
                      onClick={cancelEditingName}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}

                {isEditingName && !isValidName(sanitizedName) && (
                  <p className="text-sm text-error">
                    Usa entre 2 y 80 caracteres.
                  </p>
                )}
                {message && (
                  <p className="text-sm text-accent-strong">{message}</p>
                )}
                {error && <p className="text-sm text-error">{error}</p>}
              </div>
            </section>

            <section className="rounded-[1.2rem] border border-[#e2cdbb]/72 bg-white/42 p-5 shadow-soft backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Voz de los agentes
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {userPlan === "free"
                      ? "La voz de los agentes está disponible en los planes Plus y Pro."
                      : "Cuando esté activa, los agentes leerán sus respuestas en voz alta, uno por uno. Puedes pausar o detener la reproducción en cualquier momento."}
                  </p>
                </div>
                {userPlan !== "free" && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={voiceEnabled}
                    aria-label="Activar voz de los agentes"
                    onClick={() => {
                      const next = !voiceEnabled;
                      setVoiceEnabled(next);
                      saveVoiceEnabled(next);
                    }}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 ${
                      voiceEnabled
                        ? "border-accent bg-accent"
                        : "border-[#d9b89e] bg-[#ead8c8]/60"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ${
                        voiceEnabled ? "translate-x-[1.25rem]" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                )}
              </div>

              {userPlan === "free" && (
                <div className="mt-4 flex items-center gap-3 rounded-[0.8rem] border border-[#d9b89e]/40 bg-[#fdf6ef]/60 px-4 py-3">
                  <LockedIcon />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Función no disponible en tu plan
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Mejora a Plus o Pro para que los agentes hablen sus respuestas en voz alta.
                    </p>
                  </div>
                  <LinkButton
                    href="/account#billing"
                    variant="primary"
                    className="shrink-0 text-xs"
                  >
                    Mejorar plan
                  </LinkButton>
                </div>
              )}

              {userPlan !== "free" && voiceEnabled && (
                <div className="mt-4 flex items-center gap-3 rounded-[0.8rem] border border-accent/25 bg-accent/5 px-4 py-3">
                  <VoiceActiveIcon />
                  <p className="text-sm text-accent-strong">
                    La voz está activa. Escucharás a Marco, Elena y Rafael cuando
                    respondan en la sesión.
                  </p>
                </div>
              )}
            </section>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#e2cdbb]/65 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm leading-relaxed text-muted">
              {hasSurvey
                ? "Tus conversaciones te esperan justo donde las dejaste."
                : "Antes de hablar con el council, completa tu primer contexto."}
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
        </div>
      </section>

      <BillingPanel />
    </div>
  );
}

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function VoiceActiveIcon() {
  return (
    <svg
      aria-hidden
      className="size-5 shrink-0 text-accent"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function LockedIcon() {
  return (
    <svg
      aria-hidden
      className="size-5 shrink-0 text-muted"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
