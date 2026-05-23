"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  chatChangeEventName,
  deletePersistentChatSession,
  exportChatSession,
  getChatSessions,
  refreshChatSessionsFromServer,
  renamePersistentChatSession,
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
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSessions(getChatSessions());
    void refreshChatSessionsFromServer().then(setSessions);
  }, [activeChatId]);

  useEffect(() => {
    function syncSessions() {
      setSessions(getChatSessions());
    }
    window.addEventListener(chatChangeEventName(), syncSessions);
    window.addEventListener("storage", syncSessions);
    return () => {
      window.removeEventListener(chatChangeEventName(), syncSessions);
      window.removeEventListener("storage", syncSessions);
    };
  }, []);

  useEffect(() => {
    if (!menuOpenId) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpenId]);

  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  function handleMenuToggle(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setMenuOpenId((prev) => (prev === id ? null : id));
  }

  function handleRenameStart(id: string) {
    const session = sessions.find((s) => s.id === id);
    setRenameValue(session?.title ?? "");
    setRenamingId(id);
    setMenuOpenId(null);
  }

  async function handleRenameSubmit() {
    if (!renamingId) return;
    await renamePersistentChatSession(renamingId, renameValue);
    setSessions(getChatSessions());
    setRenamingId(null);
  }

  function handleDeleteRequest(id: string) {
    setMenuOpenId(null);
    setConfirmDeleteId(id);
  }

  async function handleConfirmDelete() {
    if (!confirmDeleteId) return;
    const wasActive = confirmDeleteId === activeChatId;
    await deletePersistentChatSession(confirmDeleteId);
    setSessions(getChatSessions());
    setConfirmDeleteId(null);
    if (wasActive) onNewChat();
  }

  const handleExport = useCallback((id: string) => {
    setMenuOpenId(null);
    const md = exportChatSession(id);
    if (!md) return;
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `councilia-chat-${id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="fixed left-3 top-3 z-30 flex size-9 items-center justify-center rounded-lg border border-border bg-elevated text-muted shadow-sm transition-all duration-300 hover:border-accent/50 hover:text-foreground"
        style={{
          opacity: collapsed ? 1 : 0,
          pointerEvents: collapsed ? "auto" : "none",
          transform: collapsed ? "translateX(0)" : "translateX(-12px)",
        }}
        aria-label="Abrir historial"
        title="Abrir historial"
      >
        <ChevronRightIcon />
      </button>

      <aside
        className="sticky top-0 flex h-dvh shrink-0 flex-col border-r border-border bg-elevated/40 transition-all duration-300 ease-in-out"
        style={{
          width: collapsed ? 0 : 256,
          minWidth: collapsed ? 0 : 256,
          opacity: collapsed ? 0 : 1,
          transform: collapsed ? "translateX(-256px)" : "translateX(0)",
          overflow: "hidden",
        }}
      >
        <div className="flex w-64 items-center justify-between border-b border-border px-4 py-3">
          <span className="text-[11px] font-medium uppercase tracking-widest text-muted">
            Tus chats
          </span>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="flex size-7 items-center justify-center rounded-md text-muted transition hover:bg-background hover:text-foreground"
            aria-label="Cerrar sidebar"
            title="Cerrar sidebar"
          >
            <ChevronLeftIcon />
          </button>
        </div>

        <div className="w-64 flex-1 overflow-y-auto px-2 py-2">
          {sessions.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted/70">
              Aún no tienes chats guardados.
            </p>
          )}
          {sessions.map((s) => {
            const isActive = s.id === activeChatId;
            const isRenaming = renamingId === s.id;
            const date = new Date(s.updatedAt);
            const dateStr = date.toLocaleDateString("es-MX", {
              day: "numeric",
              month: "short",
            });
            const turnLabel =
              s.turns.length === 0
                ? "ningún turno"
                : s.turns.length === 1
                  ? "1 turno"
                  : `${s.turns.length} turnos`;
            return (
              <div
                key={s.id}
                className={`group relative rounded-lg transition ${
                  isActive ? "bg-accent/10" : "hover:bg-elevated"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectChat(s.id)}
                  className={`flex w-full flex-col gap-0.5 px-3 py-2.5 pr-16 text-left ${
                    isActive
                      ? "text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {isRenaming ? (
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => void handleRenameSubmit()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleRenameSubmit();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full rounded-md border border-accent/40 bg-background px-2 py-1 text-sm font-medium text-foreground outline-none ring-1 ring-accent/20"
                      maxLength={80}
                    />
                  ) : (
                    <p className="truncate text-sm font-medium leading-snug">
                      {s.title}
                    </p>
                  )}
                  <p className="text-[10px] text-muted">
                    {dateStr} · {turnLabel}
                  </p>
                </button>

                {!isRenaming && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRenameStart(s.id);
                    }}
                    className="absolute right-8 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted/40 opacity-0 transition hover:bg-accent/10 hover:text-accent group-hover:opacity-100"
                    aria-label="Renombrar chat"
                    title="Renombrar chat"
                  >
                    <PencilIcon />
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => handleMenuToggle(e, s.id)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted/40 opacity-0 transition hover:bg-background hover:text-foreground group-hover:opacity-100"
                  aria-label="Opciones"
                  title="Opciones"
                >
                  <MoreIcon />
                </button>

                {menuOpenId === s.id && (
                  <div
                    ref={menuRef}
                    className="absolute right-1 top-full z-40 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-background shadow-lg"
                    style={{ animation: "soft-rise 150ms ease-out both" }}
                  >
                    <button
                      type="button"
                      onClick={() => handleRenameStart(s.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground transition hover:bg-elevated"
                    >
                      <PencilIcon />
                      Renombrar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport(s.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground transition hover:bg-elevated"
                    >
                      <ExportIcon />
                      Exportar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRequest(s.id)}
                      className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-xs transition hover:bg-elevated"
                      style={{ color: "#c0392b" }}
                    >
                      <TrashIcon />
                      Borrar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="w-64 border-t border-border px-3 py-3">
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

      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          style={{ animation: "sidebar-fade-in 200ms ease-out both" }}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl"
            style={{ animation: "soft-rise 200ms ease-out both" }}
          >
            <p className="text-sm font-medium text-foreground">
              ¿Seguro que quieres borrar este chat?
            </p>
            <p className="mt-1 text-xs text-muted">
              Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted transition hover:bg-elevated hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                className="rounded-lg px-4 py-2 text-xs font-semibold shadow-sm transition"
                style={{ backgroundColor: "#c0392b", color: "#ffffff" }}
              >
                Borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="9 18 15 12 9 6" />
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

function MoreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
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
