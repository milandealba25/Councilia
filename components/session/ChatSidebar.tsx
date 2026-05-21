"use client";

import { useEffect, useState } from "react";
import {
  getChatSessions,
  deleteChatSession,
  type ChatSession,
} from "@/lib/chat/chatStorage";

interface Props {
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
}

export function ChatSidebar({ activeChatId, onSelectChat, onNewChat }: Props) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setSessions(getChatSessions());
  }, [activeChatId]);

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    deleteChatSession(id);
    setSessions(getChatSessions());
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="fixed left-3 top-3 z-30 flex size-9 items-center justify-center rounded-full border border-border bg-elevated text-muted shadow-sm transition hover:border-accent/50 hover:text-foreground"
        aria-label="Abrir historial"
        title="Abrir historial"
      >
        <MenuIcon />
      </button>
    );
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-elevated/40">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-[11px] font-medium uppercase tracking-widest text-muted">
          Tus chats
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="text-muted transition hover:text-foreground"
          aria-label="Cerrar sidebar"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {sessions.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted/70">
            Aún no tienes chats guardados.
          </p>
        )}
        {sessions.map((s) => {
          const isActive = s.id === activeChatId;
          const date = new Date(s.updatedAt);
          const dateStr = date.toLocaleDateString("es-MX", {
            day: "numeric",
            month: "short",
          });
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectChat(s.id)}
              className={`group flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition ${
                isActive
                  ? "bg-accent/10 text-foreground"
                  : "text-muted hover:bg-elevated hover:text-foreground"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-snug">
                  {s.title}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">
                  {dateStr} · {s.turns.length}{" "}
                  {s.turns.length === 1 ? "turno" : "turnos"}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => handleDelete(e, s.id)}
                className="mt-0.5 shrink-0 rounded p-0.5 text-muted/50 opacity-0 transition hover:text-error group-hover:opacity-100"
                aria-label="Eliminar chat"
                title="Eliminar chat"
              >
                <TrashIcon />
              </button>
            </button>
          );
        })}
      </div>

      <div className="border-t border-border px-3 py-3">
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-accent/40 px-3 py-2 text-xs font-medium uppercase tracking-wider text-accent transition hover:border-accent hover:bg-accent/5"
        >
          <PlusIcon />
          Nuevo chat
        </button>
      </div>
    </aside>
  );
}

function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}
