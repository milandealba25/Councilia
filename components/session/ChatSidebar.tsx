"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  chatChangeEventName,
  getChatSessions,
  deletePersistentChatSession,
  refreshChatSessionsFromServer,
  renamePersistentChatSession,
  exportChatSession,
  type ChatSession,
} from "@/lib/chat/chatStorage";

interface Props {
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat?: (id: string) => void;
  onDeleteChats?: (ids: string[]) => void;
  newChatPending?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function ChatSidebar({
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onDeleteChats,
  newChatPending = false,
  onCollapsedChange,
}: Props) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const submittedRenameIdRef = useRef<string | null>(null);
  const cancelledRenameRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setSessions(getChatSessions());
    void refreshChatSessionsFromServer()
      .then((nextSessions) => {
        if (!cancelled) setSessions(nextSessions);
      })
      .catch(() => {
        if (!cancelled) setSessions(getChatSessions());
      });
    return () => {
      cancelled = true;
    };
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
    const sessionIds = new Set(sessions.map((session) => session.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => sessionIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [sessions]);

  // Cerrar menú al hacer click fuera
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

  // Focus del input de renombrar
  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  function handleMenuToggle(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setMenuOpenId((prev) => (prev === id ? null : id));
  }

  function toggleSelected(id: string) {
    setMenuOpenId(null);
    setRenamingId(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setConfirmDeleteIds(null);
  }

  function updateCollapsed(nextCollapsed: boolean) {
    setCollapsed(nextCollapsed);
    onCollapsedChange?.(nextCollapsed);
  }

  function handleRenameStart(id: string) {
    const session = sessions.find((s) => s.id === id);
    submittedRenameIdRef.current = null;
    cancelledRenameRef.current = false;
    setRenameValue(session?.title ?? "");
    setRenamingId(id);
    setMenuOpenId(null);
  }

  async function handleRenameSubmit() {
    if (!renamingId) return;
    const id = renamingId;
    if (cancelledRenameRef.current || submittedRenameIdRef.current === id) {
      return;
    }
    submittedRenameIdRef.current = id;
    const title = renameValue;
    setRenamingId(null);
    await renamePersistentChatSession(id, title).catch(() => undefined);
    setSessions(getChatSessions());
  }

  function handleDeleteRequest(id: string) {
    setMenuOpenId(null);
    setConfirmDeleteId(id);
  }

  async function handleConfirmDelete() {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    onDeleteChat?.(id);
    await deletePersistentChatSession(id);
    setSessions(getChatSessions());
  }

  function handleBulkDeleteRequest() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setMenuOpenId(null);
    setConfirmDeleteIds(ids);
  }

  async function handleConfirmBulkDelete() {
    if (!confirmDeleteIds?.length) return;
    const ids = confirmDeleteIds;
    setConfirmDeleteIds(null);
    setSelectedIds(new Set());
    if (onDeleteChats) onDeleteChats(ids);
    else ids.forEach((id) => onDeleteChat?.(id));
    await Promise.all(ids.map((id) => deletePersistentChatSession(id)));
    setSessions(getChatSessions());
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

  const isSelecting = selectedIds.size > 0;
  const selectedLabel =
    selectedIds.size === 1
      ? "1 seleccionado"
      : `${selectedIds.size} seleccionados`;

  return (
    <>
      {/* Toggle flotante */}
      <button
        type="button"
        onClick={() => updateCollapsed(false)}
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

      {/* Sidebar */}
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
            {isSelecting ? selectedLabel : "Tus chats"}
          </span>
          {isSelecting ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleBulkDeleteRequest}
                className="flex size-7 items-center justify-center rounded-md text-muted transition hover:bg-background"
                style={{ color: "#c0392b" }}
                aria-label="Borrar chats seleccionados"
                title="Borrar chats seleccionados"
              >
                <TrashIcon />
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="flex size-7 items-center justify-center rounded-md text-muted transition hover:bg-background hover:text-foreground"
                aria-label="Cancelar selección"
                title="Cancelar selección"
              >
                <XIcon />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => updateCollapsed(true)}
              className="flex size-7 items-center justify-center rounded-md text-muted transition hover:bg-background hover:text-foreground"
              aria-label="Cerrar sidebar"
              title="Cerrar sidebar"
            >
              <ChevronLeftIcon />
            </button>
          )}
        </div>

        <div className="w-64 flex-1 overflow-y-auto px-2 py-2">
          {sessions.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted/70">
              Aún no tienes chats guardados.
            </p>
          )}
          {sessions.map((s) => {
            const isActive = s.id === activeChatId;
            const isSelected = selectedIds.has(s.id);
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
                  isSelected
                    ? "bg-accent/15"
                    : isActive
                      ? "bg-accent/10"
                      : "hover:bg-elevated"
                }`}
              >
                {!isRenaming && (
                  <label
                    className={[
                      "absolute left-2 top-1/2 z-10 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center transition",
                      isSelecting
                        ? "pointer-events-auto opacity-100"
                        : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100",
                    ].join(" ")}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Seleccionar ${s.title}`}
                    title="Seleccionar chat"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(s.id)}
                      className="sr-only"
                    />
                    <span
                      className={[
                        "flex size-4 items-center justify-center rounded border transition",
                        isSelected
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border-strong bg-background/85 text-transparent hover:border-accent",
                      ].join(" ")}
                    >
                      <CheckIcon />
                    </span>
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (isSelecting) {
                      toggleSelected(s.id);
                      return;
                    }
                    onSelectChat(s.id);
                  }}
                  className={`flex w-full flex-col gap-0.5 py-2.5 text-left transition-[padding] ${
                    isSelecting
                      ? "pl-10 pr-3"
                      : "pl-3 pr-16 group-hover:pl-10"
                  } ${
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
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleRenameSubmit();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancelledRenameRef.current = true;
                          setRenamingId(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full rounded border border-accent/40 bg-background px-1.5 py-0.5 text-sm font-medium text-foreground outline-none focus:border-accent"
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

                {/* Botón de 3 puntos */}
                {!isRenaming && !isSelecting && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRenameStart(s.id);
                    }}
                    className="absolute right-8 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted/40 opacity-0 transition hover:bg-background hover:text-foreground group-hover:opacity-100"
                    aria-label="Editar nombre"
                    title="Editar nombre"
                  >
                    <PencilIcon />
                  </button>
                )}

                {!isSelecting && (
                  <button
                    type="button"
                    onClick={(e) => handleMenuToggle(e, s.id)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted/40 opacity-0 transition hover:bg-background hover:text-foreground group-hover:opacity-100"
                    aria-label="Opciones"
                    title="Opciones"
                  >
                    <MoreIcon />
                  </button>
                )}

                {/* Dropdown */}
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
            disabled={newChatPending}
            aria-busy={newChatPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-accent/40 px-3 py-2 text-xs font-medium uppercase tracking-wider text-accent transition hover:border-accent hover:bg-accent/5 disabled:cursor-wait disabled:opacity-60"
          >
            <PlusIcon />
            {newChatPending ? "Creando..." : "Nuevo chat"}
          </button>
        </div>
      </aside>

      {/* Modal de confirmación de borrado */}
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

      {confirmDeleteIds && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          style={{ animation: "sidebar-fade-in 200ms ease-out both" }}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl"
            style={{ animation: "soft-rise 200ms ease-out both" }}
          >
            <p className="text-sm font-medium text-foreground">
              ¿Seguro que quieres borrar{" "}
              {confirmDeleteIds.length === 1
                ? "este chat"
                : `${confirmDeleteIds.length} chats`}
              ?
            </p>
            <p className="mt-1 text-xs text-muted">
              Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteIds(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted transition hover:bg-elevated hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmBulkDelete()}
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

/* ─── Íconos ─── */

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
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
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

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
