"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getValidAuthSession } from "@/lib/auth/client";
import { resolvePostAuthRedirect } from "@/lib/auth/flow";

export function LandingAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function routeActiveSession() {
      const openedFromSession =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("from") === "session";
      if (openedFromSession) return;

      const session = await getValidAuthSession();
      if (!session) return;

      const destination = await resolvePostAuthRedirect("/session");
      router.replace(destination as never);
    }

    void routeActiveSession();
  }, [router]);

  return null;
}
