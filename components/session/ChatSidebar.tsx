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
  const [query, setQuery] = useState("");
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
  const filteredSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const sidebarWidth = 264;

  return (
    <>
      {/* Toggle flotante */}
      <button
        type="button"
        onClick={() => updateCollapsed(false)}
        className="fixed left-3 top-3 z-30 flex size-9 items-center justify-center rounded-xl border border-[#dc8152]/55 bg-[#ffead8]/94 text-[#8f431f] shadow-[0_14px_34px_rgba(171,81,34,0.2)] backdrop-blur-xl transition-all duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[#d86131]/70 hover:bg-[#fff3e8] hover:text-[#c94f28]"
        style={{
          opacity: collapsed ? 1 : 0,
          pointerEvents: collapsed ? "auto" : "none",
          transform: collapsed ? "translateX(0) scale(1)" : "translateX(-28px) scale(0.9)",
        }}
        aria-label="Abrir historial"
        title="Abrir historial"
      >
        <PanelIcon />
      </button>

      {/* Sidebar */}
      <aside
        style={{
          width: collapsed ? 0 : sidebarWidth,
          minWidth: collapsed ? 0 : sidebarWidth,
          opacity: collapsed ? 0 : 1,
          transform: collapsed ? `translateX(-${sidebarWidth}px)` : "translateX(0)",
          overflow: "hidden",
        }}
        className="flex h-[calc(100dvh-1rem)] shrink-0 flex-col rounded-r-[1.35rem] border border-l-0 border-[#d77d4b]/45 bg-[linear-gradient(180deg,rgba(255,226,201,0.94)_0%,rgba(255,238,222,0.86)_42%,rgba(255,218,188,0.9)_100%)] text-[#432516] shadow-[16px_0_44px_rgba(147,68,28,0.18),inset_-1px_0_0_rgba(199,91,43,0.18),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-2xl transition-all duration-[560ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
      >
        <div className="w-[264px] border-b border-[#c76a3c]/34 bg-[#fff1e6]/42 px-3 py-3 shadow-[0_1px_0_rgba(255,255,255,0.56)]">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => updateCollapsed(true)}
                className="flex size-8 items-center justify-center rounded-xl text-[#884521] transition hover:bg-[#dc6f3b]/14 hover:text-[#bd4e27]"
                aria-label="Cerrar sidebar"
                title="Cerrar sidebar"
              >
                <PanelIcon />
              </button>
              <span className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-[#944c2b]">
                {isSelecting ? selectedLabel : "Conversaciones"}
              </span>
            </div>
            {isSelecting ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleBulkDeleteRequest}
                  className="flex size-8 items-center justify-center rounded-xl text-[#a9482c] transition hover:bg-[#dc6f3b]/14"
                  aria-label="Borrar chats seleccionados"
                  title="Borrar chats seleccionados"
                >
                  <TrashIcon />
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="flex size-8 items-center justify-center rounded-xl text-[#884521] transition hover:bg-[#dc6f3b]/14 hover:text-[#bd4e27]"
                  aria-label="Cancelar selección"
                  title="Cancelar selección"
                >
                  <XIcon />
                </button>
              </div>
            ) : null}
          </div>

          {!isSelecting && (
            <div className="mt-3 grid gap-1.5">
              <button
                type="button"
                onClick={onNewChat}
                disabled={newChatPending}
                aria-busy={newChatPending}
                className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm font-semibold text-[#4f2d1d] transition hover:border-[#d77d4b]/24 hover:bg-[#fff7ef]/46 hover:text-[#bd4e27] disabled:cursor-wait disabled:opacity-70"
              >
                <EditIcon />
                {newChatPending ? "Creando..." : "Nuevo chat"}
              </button>

              <label className="relative block rounded-xl border border-[#d77d4b]/18 bg-[#fff7ef]/36 shadow-[inset_0_1px_0_rgba(255,255,255,0.56)] transition focus-within:border-[#c65f32]/44 focus-within:bg-[#fff9f4]/68 hover:border-[#d77d4b]/30 hover:bg-[#fff4ea]/58">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#944c2b]">
                  <SearchIcon />
                </span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar"
                  className="w-full rounded-xl border border-transparent bg-transparent py-2.5 pl-10 pr-3 text-sm text-[#432516] outline-none transition placeholder:text-[#8c6048]/72"
                />
              </label>
            </div>
          )}
        </div>

        <div className="w-[264px] flex-1 overflow-y-auto overscroll-contain px-2 py-2">
          {sessions.length === 0 && (
            <p className="rounded-xl border border-[#d77d4b]/16 bg-[#fff7ef]/34 px-3 py-4 text-center text-xs text-[#7d573f]">
              Aún no tienes chats guardados.
            </p>
          )}
          {sessions.length > 0 && filteredSessions.length === 0 && (
            <p className="rounded-xl border border-[#d77d4b]/16 bg-[#fff7ef]/34 px-3 py-4 text-center text-xs text-[#7d573f]">
              No encontramos chats con ese título.
            </p>
          )}
          {filteredSessions.map((s) => {
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
                className={`group relative rounded-xl border transition ${
                  isSelected
                    ? "border-[#d86131]/42 bg-[#ef8a52]/18"
                    : isActive
                      ? "border-[#c95b2f]/46 bg-[#ef8a52]/24 shadow-[inset_0_0_0_1px_rgba(201,91,47,0.24),0_8px_20px_rgba(147,68,28,0.09)]"
                      : "border-transparent hover:border-[#d77d4b]/24 hover:bg-[#fff7ef]/42"
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
                          ? "border-[#c95b2f] bg-[#c95b2f] text-white"
                          : "border-[#c88a63]/70 bg-[#fff7ef]/78 text-transparent hover:border-[#c95b2f]",
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
                      ? "text-[#27150e]"
                      : "text-[#684633] hover:text-[#27150e]"
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
                      className="w-full rounded-lg border border-[#d77d4b]/48 bg-[#fff9f4] px-2 py-1 text-sm font-medium text-[#27150e] outline-none focus:border-[#c95b2f]"
                    />
                  ) : (
                    <p className="truncate text-sm font-medium leading-snug">
                      {s.title}
                    </p>
                  )}
                  <p className="text-[10px] text-[#8b6048]">
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
                    className="absolute right-8 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#8b6048]/72 opacity-0 transition hover:bg-[#dc6f3b]/14 hover:text-[#bd4e27] group-hover:opacity-100"
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
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#8b6048]/72 opacity-0 transition hover:bg-[#dc6f3b]/14 hover:text-[#bd4e27] group-hover:opacity-100"
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
                    className="absolute right-1 top-full z-40 mt-1 w-40 overflow-hidden rounded-xl border border-[#d9a17e]/58 bg-[#fff7ef] shadow-[0_14px_28px_rgba(93,48,24,0.16)]"
                    style={{ animation: "soft-rise 150ms ease-out both" }}
                  >
                    <button
                      type="button"
                      onClick={() => handleRenameStart(s.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#432516] transition hover:bg-[#ffe2ce]"
                    >
                      <PencilIcon />
                      Renombrar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport(s.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#432516] transition hover:bg-[#ffe2ce]"
                    >
                      <ExportIcon />
                      Exportar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRequest(s.id)}
                      className="flex w-full items-center gap-2 border-t border-[#d9a17e]/58 px-3 py-2 text-left text-xs text-[#a73b21] transition hover:bg-[#ffe2ce]"
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

function PanelIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M9 4v16" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
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
