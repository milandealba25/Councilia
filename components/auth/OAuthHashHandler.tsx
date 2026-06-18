"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { resolvePostAuthRedirect } from "@/lib/auth/flow";
import { hasOAuthHash, saveOAuthHashSession } from "@/lib/auth/oauthHash";
import { normalizeNextPath } from "@/lib/auth/validation";

export function OAuthHashHandler() {
  const router = useRouter();
  const handledRef = useRef(false);

  useEffect(() => {
    function handleOAuthHash() {
      if (handledRef.current) return;
      if (window.location.pathname === "/auth/callback") return;
      if (!hasOAuthHash(window.location.hash)) return;

      handledRef.current = true;
      void finishLogin();
    }

    async function finishLogin() {
      const searchParams = new URLSearchParams(window.location.search);
      const next = normalizeNextPath(searchParams.get("next"));
      const result = await saveOAuthHashSession({ next });

      if (result.status !== "success") {
        const loginParams = new URLSearchParams({
          error: "oauth_callback",
          next,
        });
        router.replace(`/login?${loginParams.toString()}` as never);
        return;
      }

      const destination = await resolvePostAuthRedirect(result.next);
      router.replace(destination as never);
    }

    handleOAuthHash();
    window.addEventListener("hashchange", handleOAuthHash);
    return () => window.removeEventListener("hashchange", handleOAuthHash);
  }, [router]);

  return null;
}
