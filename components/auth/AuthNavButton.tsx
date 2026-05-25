"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LinkButton } from "@/components/ui/Button";
import {
  authChangeEventName,
  getValidAuthSession,
  type AuthSession,
} from "@/lib/auth/client";

export function AuthNavButton() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let active = true;

    function syncSession() {
      void getValidAuthSession().then((current) => {
        if (!active) return;
        setSession(current);
        setImageFailed(false);
      });
    }

    syncSession();
    window.addEventListener(authChangeEventName(), syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      active = false;
      window.removeEventListener(authChangeEventName(), syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  if (!session) {
    return (
      <LinkButton
        href="/login"
        variant="secondary"
        className="shrink-0 px-3 text-xs sm:px-5 sm:text-sm"
      >
        <span className="sm:hidden">Entrar</span>
        <span className="hidden sm:inline">Iniciar sesión</span>
      </LinkButton>
    );
  }

  return (
    <Link
      href="/account"
      aria-label="Abrir cuenta"
      className="inline-flex items-center gap-2 rounded-council border border-border-strong/70 bg-surface/80 px-3 py-2 text-sm font-medium text-foreground backdrop-blur transition-all duration-150 hover:border-accent hover:bg-accent-soft hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-accent-soft text-[11px] font-semibold text-accent-strong">
        {session.user.avatarUrl && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span>{getInitials(session.user.name ?? session.user.email)}</span>
        )}
      </span>
      <span className="hidden sm:inline">Cuenta</span>
    </Link>
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
