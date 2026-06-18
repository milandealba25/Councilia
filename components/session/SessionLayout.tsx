"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PlanLimitProvider } from "@/components/billing/PlanLimitProvider";
import { Container } from "@/components/ui/Container";
import { SessionConsole } from "./SessionConsole";
import { ChatSidebar } from "./ChatSidebar";
import { AgentFace } from "@/components/agents/AgentFace";
import { AGENT_IDS } from "@/lib/agents/ids";
import {
  authChangeEventName,
  getValidAuthSession,
  type AuthSession,
} from "@/lib/auth/client";
import {
  chatChangeEventName,
  clearActiveChatId,
  getChatSession,
  getChatSessions,
  refreshChatSessionsFromServer,
  setActiveChatId,
  type ChatSession,
} from "@/lib/chat/chatStorage";

export function SessionLayout() {
  return (
    <PlanLimitProvider>
      <SessionLayoutInner />
    </PlanLimitProvider>
  );
}

function SessionLayoutInner() {
  const [chatId, setChatId] = useState<string | null>(null);
  const [consoleKey, setConsoleKey] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeChatTitle, setActiveChatTitle] = useState("Nuevo chat");
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [profileImageFailed, setProfileImageFailed] = useState(false);

  useEffect(() => {
    async function hydrateChats() {
      await refreshChatSessionsFromServer().catch(() =>
        getChatSessions(),
      );
    }

    void hydrateChats();
  }, []);

  useEffect(() => {
    function syncActiveTitle() {
      const session = chatId ? getChatSession(chatId) : null;
      setActiveChatTitle(session?.title?.trim() || "Nuevo chat");
    }
    syncActiveTitle();
    window.addEventListener(chatChangeEventName(), syncActiveTitle);
    window.addEventListener("storage", syncActiveTitle);
    return () => {
      window.removeEventListener(chatChangeEventName(), syncActiveTitle);
      window.removeEventListener("storage", syncActiveTitle);
    };
  }, [chatId]);

  useEffect(() => {
    let active = true;
    function syncAuthSession() {
      void getValidAuthSession().then((session) => {
        if (!active) return;
        setAuthSession(session);
        setProfileImageFailed(false);
      });
    }
    syncAuthSession();
    window.addEventListener(authChangeEventName(), syncAuthSession);
    window.addEventListener("storage", syncAuthSession);
    return () => {
      active = false;
      window.removeEventListener(authChangeEventName(), syncAuthSession);
      window.removeEventListener("storage", syncAuthSession);
    };
  }, []);

  const handleNewChat = useCallback(() => {
    clearActiveChatId();
    setChatId(null);
    setConsoleKey((k) => k + 1);
  }, []);

  const handleChatCreated = useCallback((session: ChatSession) => {
    setActiveChatId(session.id);
    setChatId(session.id);
  }, []);

  const handleSelectChat = useCallback((id: string) => {
    if (id === chatId) return;
    async function select() {
      const sessions = await refreshChatSessionsFromServer().catch(() =>
        getChatSessions(),
      );
      const session =
        sessions.find((item) => item.id === id) ?? getChatSession(id);
      if (!session) return;
      setActiveChatId(id);
      setChatId(id);
      setConsoleKey((k) => k + 1);
    }
    void select();
  }, [chatId]);

  const handleDeleteChat = useCallback((id: string) => {
    if (id !== chatId) return;
    async function chooseReplacement() {
      const next = getChatSessions().find((session) => session.id !== id);
      if (next) {
        setActiveChatId(next.id);
        setChatId(next.id);
        setConsoleKey((k) => k + 1);
        return;
      }
      clearActiveChatId();
      setChatId(null);
      setConsoleKey((k) => k + 1);
    }
    void chooseReplacement();
  }, [chatId]);

  const handleDeleteChats = useCallback((ids: string[]) => {
    if (!chatId || !ids.includes(chatId)) return;
    const deletingIds = new Set(ids);
    async function chooseReplacement() {
      const next = getChatSessions().find(
        (session) => !deletingIds.has(session.id),
      );
      if (next) {
        setActiveChatId(next.id);
        setChatId(next.id);
        setConsoleKey((k) => k + 1);
        return;
      }
      clearActiveChatId();
      setChatId(null);
      setConsoleKey((k) => k + 1);
    }
    void chooseReplacement();
  }, [chatId]);

  const isFreshChat = chatId === null;

  return (
    <div className="flex h-dvh gap-2 overflow-hidden overscroll-none bg-[linear-gradient(135deg,rgba(255,241,229,0.36),rgba(255,250,244,0.18),rgba(223,235,224,0.20))] p-2 pl-0">
      <ChatSidebar
        activeChatId={chatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onDeleteChats={handleDeleteChats}
        onCollapsedChange={setSidebarCollapsed}
      />

      <main
        className={`h-[calc(100dvh-1rem)] min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain border border-[#d9784c]/12 bg-[#fffaf2]/82 shadow-[0_20px_70px_rgba(116,68,43,0.10)] backdrop-blur-[3px] transition-[border-radius,box-shadow,transform] duration-[560ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          sidebarCollapsed
            ? "rounded-[1.25rem]"
            : "rounded-[1.55rem] shadow-[-18px_0_56px_rgba(116,68,43,0.13)]"
        }`}
      >
        <header className="sticky top-0 z-20 overflow-hidden border-b border-[#c88a65]/18 bg-[#f8eadc]/95 px-4 py-2.5 shadow-[0_14px_38px_rgba(90,55,36,0.075)] backdrop-blur-xl">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(248,234,220,0.98),rgba(250,238,226,0.96),rgba(241,211,190,0.9))]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-10 translate-y-1/2 bg-gradient-to-b from-[#f8eadc]/78 to-transparent"
          />
          <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
                Chat actual
              </p>
              <h1 className="truncate text-sm font-semibold text-foreground md:text-base">
                {activeChatTitle}
              </h1>
            </div>
            <nav className="flex shrink-0 items-center gap-2" aria-label="Navegación de sesión">
              <Link
                href="/?from=session"
                className="grid size-9 place-items-center rounded-xl border border-[#d9784c]/24 bg-[#fff4e6]/88 text-[#9a5c43] shadow-[0_10px_24px_rgba(145,83,50,0.12)] backdrop-blur-md transition hover:border-[#d9784c]/55 hover:bg-white hover:text-[#d96339]"
                aria-label="Ir a inicio"
                title="Inicio"
              >
                <HomeIcon />
              </Link>
              <ProfileNavButton
                session={authSession}
                imageFailed={profileImageFailed}
                onImageError={() => setProfileImageFailed(true)}
              />
            </nav>
          </div>
        </header>

        <Container className={isFreshChat ? "max-w-5xl py-6 md:py-8" : "max-w-4xl py-10 md:py-12"}>
          {!isFreshChat && (
            <>
              <div className="relative flex items-center justify-center">
                <Link
                  href="/?from=session"
                  className="sr-only"
                >
                  ← Inicio
                </Link>
                <div
                  className="absolute left-1/2 flex -translate-x-1/2 items-center gap-3"
                  aria-label="Tu council"
                >
                  {AGENT_IDS.map((id, i) => (
                    <span
                      key={id}
                      style={{
                        animation: `soft-rise 700ms ease-out ${i * 140}ms both`,
                      }}
                    >
                      <AgentFace agent={id} size={47} mood="listening" />
                    </span>
                  ))}
                </div>
                <Link
                  href="/account?from=session"
                  className="sr-only"
                >
                  Cuenta
                </Link>
              </div>

              <header className="mx-auto mt-8 mb-[34px] max-w-3xl text-center">
                <p className="text-xs font-medium uppercase tracking-widest text-accent">
                  Tu council está aquí
                </p>
                <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  Marco, Elena y Rafael te están esperando.
                </h1>
                <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-muted">
                  Cuéntales lo que te tiene así. Sin filtros. Cuando termines, te
                  van a responder los tres a la vez, sin ponerse de acuerdo. Si dos
                  de ellos se contradicen, uno toma la palabra y te hace una sola
                  pregunta dura. Después, tu turno.
                </p>
              </header>
            </>
          )}

          <SessionConsole
            key={consoleKey}
            chatId={chatId}
            onChatCreated={handleChatCreated}
          />
        </Container>
      </main>
    </div>
  );
}

interface ProfileNavButtonProps {
  session: AuthSession | null;
  imageFailed: boolean;
  onImageError: () => void;
}

function ProfileNavButton({
  session,
  imageFailed,
  onImageError,
}: ProfileNavButtonProps) {
  const label = session ? "Abrir perfil" : "Iniciar sesión";
  return (
    <Link
      href={session ? "/account?from=session" : "/login?next=/session"}
      aria-label={label}
      title={label}
      className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#d9784c]/24 bg-[#fff4e6]/88 px-2.5 text-xs font-semibold text-[#7a4d3f] shadow-[0_10px_24px_rgba(145,83,50,0.12)] backdrop-blur-md transition hover:border-[#d9784c]/55 hover:bg-white hover:text-[#d96339]"
    >
      <span className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-full border border-[#d98e68]/42 bg-[#fff0e7] text-[10px] font-semibold text-accent-strong">
        {session?.user.avatarUrl && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
            onError={onImageError}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span>{getInitials(session?.user.name ?? session?.user.email ?? "Perfil")}</span>
        )}
      </span>
      <span className="hidden sm:inline">{session ? "Perfil" : "Entrar"}</span>
    </Link>
  );
}

function HomeIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9 21v-7h6v7" />
    </svg>
  );
}

function getInitials(value: string): string {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "C";
  return parts.map((part) => part[0]?.toUpperCase()).join("");
}
