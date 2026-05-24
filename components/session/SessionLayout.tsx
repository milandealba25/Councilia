"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { SessionConsole } from "./SessionConsole";
import { ChatSidebar } from "./ChatSidebar";
import { AgentFace } from "@/components/agents/AgentFace";
import { AGENT_IDS } from "@/lib/agents/ids";
import { loadAuthSession } from "@/lib/auth/client";
import {
  createPersistentChatSession,
  getActiveChatId,
  getChatSession,
  getChatSessions,
  refreshChatSessionsFromServer,
  setActiveChatId,
} from "@/lib/chat/chatStorage";

export function SessionLayout() {
  const router = useRouter();
  const [chatId, setChatId] = useState<string | null>(() => getActiveChatId());
  const [consoleKey, setConsoleKey] = useState(0);
  const [chatsHydrated, setChatsHydrated] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);

  useEffect(() => {
    async function hydrateChats() {
      const sessions = await refreshChatSessionsFromServer();
      const active = getActiveChatId();
      if (active) {
        setChatId(active);
        setConsoleKey((k) => k + 1);
        setChatsHydrated(true);
        return;
      }
      if (sessions[0]) {
        setActiveChatId(sessions[0].id);
        setChatId(sessions[0].id);
        setConsoleKey((k) => k + 1);
        setChatsHydrated(true);
        return;
      }
      const guestMode =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("guest") === "1";
      if (loadAuthSession() || guestMode) {
        try {
          const session = await createPersistentChatSession();
          setChatId(session.id);
          setActiveChatId(session.id);
          setConsoleKey((k) => k + 1);
        } catch (err) {
          if ((err as Error).message === "survey_required") {
            router.replace("/onboarding" as never);
          }
        }
      }
      setChatsHydrated(true);
    }

    void hydrateChats();
  }, [router]);

  const handleNewChat = useCallback(() => {
    if (creatingChat) return;
    async function create() {
      setCreatingChat(true);
      try {
        const session = await createPersistentChatSession();
        setChatId(session.id);
        setActiveChatId(session.id);
        setConsoleKey((k) => k + 1);
      } catch (err) {
        if ((err as Error).message === "survey_required") {
          router.replace("/onboarding" as never);
        }
      } finally {
        setCreatingChat(false);
      }
    }
    void create();
  }, [creatingChat, router]);

  const handleSelectChat = useCallback((id: string) => {
    if (id === chatId) return;
    async function select() {
      const sessions = await refreshChatSessionsFromServer();
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
      try {
        const session = await createPersistentChatSession();
        setActiveChatId(session.id);
        setChatId(session.id);
        setConsoleKey((k) => k + 1);
      } catch (err) {
        if ((err as Error).message === "survey_required") {
          router.replace("/onboarding" as never);
        }
      }
    }
    void chooseReplacement();
  }, [chatId, router]);

  return (
    <div className="flex min-h-dvh">
      <ChatSidebar
        activeChatId={chatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        newChatPending={creatingChat}
      />

      <main className="flex-1 py-12">
        <Container className="max-w-5xl">
          <div className="relative flex items-center justify-between">
            <Link
              href="/?from=session"
              className="text-xs uppercase tracking-wider text-muted hover:text-foreground"
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
              href="/account"
              className="text-xs uppercase tracking-wider text-muted hover:text-foreground"
            >
              Cuenta
            </Link>
          </div>

          <header className="mt-8 mb-[34px]">
            <p className="text-xs font-medium uppercase tracking-widest text-accent">
              Tu council está aquí
            </p>
            <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Marco, Elena y Rafael te están esperando.
            </h1>
            <p className="mt-3 max-w-2xl leading-relaxed text-muted">
              Cuéntales lo que te tiene así. Sin filtros. Cuando termines, te
              van a responder los tres a la vez, sin ponerse de acuerdo. Si dos
              de ellos se contradicen, uno toma la palabra y te hace una sola
              pregunta dura. Después, tu turno.
            </p>
          </header>

          {chatsHydrated ? (
            <SessionConsole
              key={consoleKey}
              chatId={chatId}
            />
          ) : (
            <p className="text-sm text-muted">Cargando tus chats...</p>
          )}
        </Container>
      </main>
    </div>
  );
}
