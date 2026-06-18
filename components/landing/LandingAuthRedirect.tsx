"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getValidAuthSession } from "@/lib/auth/client";
import { resolvePostAuthRedirect } from "@/lib/auth/flow";
import { hasOAuthHash } from "@/lib/auth/oauthHash";

export function LandingAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function routeActiveSession() {
      if (hasOAuthHash(window.location.hash)) return;

      const from =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("from")
          : null;
      const userExplicitlyOpenedLanding =
        from === "session" || from === "account" || from === "home";
      if (userExplicitlyOpenedLanding) return;

      const session = await getValidAuthSession();
      if (!session) return;

      const destination = await resolvePostAuthRedirect("/session");
      router.replace(destination as never);
    }

    void routeActiveSession();
  }, [router]);

  return null;
}
