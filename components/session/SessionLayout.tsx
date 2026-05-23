"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SessionConsole } from "./SessionConsole";
import { ChatSidebar } from "./ChatSidebar";
import { AgentFace } from "@/components/agents/AgentFace";
import { AGENT_IDS } from "@/lib/agents/ids";
import {
  createPersistentChatSession,
  getActiveChatId,
  refreshChatSessionsFromServer,
  setActiveChatId,
} from "@/lib/chat/chatStorage";

export function SessionLayout() {
  const [chatId, setChatId] = useState<string | null>(() => getActiveChatId());
  const [consoleKey, setConsoleKey] = useState(0);

  useEffect(() => {
    async function hydrateChats() {
      const sessions = await refreshChatSessionsFromServer();
      const active = getActiveChatId();
      if (active) {
        setChatId(active);
        setConsoleKey((k) => k + 1);
        return;
      }
      if (sessions[0]) {
        setActiveChatId(sessions[0].id);
        setChatId(sessions[0].id);
        setConsoleKey((k) => k + 1);
      }
    }

    void hydrateChats();
  }, []);

  const handleNewChat = useCallback(() => {
    async function create() {
      const session = await createPersistentChatSession();
      setChatId(session.id);
      setActiveChatId(session.id);
      setConsoleKey((k) => k + 1);
    }
    void create();
  }, []);

  const handleSelectChat = useCallback((id: string) => {
    setChatId(id);
    setActiveChatId(id);
    setConsoleKey((k) => k + 1);
  }, []);

  const handleChatCreated = useCallback((id: string) => {
    setChatId(id);
  }, []);

  return (
    <div className="flex min-h-dvh">
      <ChatSidebar
        activeChatId={chatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
      />

      <main className="flex-1 py-12">
        <Container className="max-w-5xl">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-xs uppercase tracking-wider text-muted hover:text-foreground"
            >
              ← Inicio
            </Link>
            <Link
              href="/account"
              className="text-xs uppercase tracking-wider text-muted hover:text-foreground"
            >
              Cuenta
            </Link>
          </div>

          <header className="mt-8 mb-10">
            <div
              className="mb-5 flex items-center gap-3"
              aria-label="Tu council"
            >
              {AGENT_IDS.map((id, i) => (
                <span
                  key={id}
                  style={{
                    animation: `soft-rise 700ms ease-out ${i * 140}ms both`,
                  }}
                >
                  <AgentFace agent={id} size={52} mood="listening" />
                </span>
              ))}
            </div>
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
