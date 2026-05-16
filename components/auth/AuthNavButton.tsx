"use client";

import { useEffect, useState } from "react";
import { LinkButton } from "@/components/ui/Button";
import {
  authChangeEventName,
  loadAuthSession,
  type AuthSession,
} from "@/lib/auth/client";

export function AuthNavButton() {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    function syncSession() {
      setSession(loadAuthSession());
    }

    syncSession();
    window.addEventListener(authChangeEventName(), syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener(authChangeEventName(), syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  return (
    <LinkButton
      href={session ? "/account" : "/login"}
      variant="secondary"
      className="px-3 sm:px-5"
    >
      {session ? "Cuenta" : "Login"}
    </LinkButton>
  );
}
