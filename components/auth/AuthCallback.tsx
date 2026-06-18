"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resolvePostAuthRedirect } from "@/lib/auth/flow";
import { saveOAuthHashSession } from "@/lib/auth/oauthHash";

type Status = "loading" | "error";

export function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const handledRef = useRef(false);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Estamos confirmando tu sesion.");

  useEffect(() => {
    async function finishLogin() {
      if (handledRef.current) return;
      handledRef.current = true;

      const result = await saveOAuthHashSession({ next: params.get("next") });

      if (result.status === "empty") {
        setStatus("error");
        setMessage(
          "Supabase no devolvio un token de acceso. Revisa la URL de callback.",
        );
        return;
      }

      if (result.status === "error") {
        setStatus("error");
        setMessage(result.message);
        return;
      }

      const destination = await resolvePostAuthRedirect(result.next);
      router.replace(destination as never);
    }

    void finishLogin();
  }, [params, router]);

  return (
    <div
      className="rounded-council-lg border border-border/70 bg-surface/70 p-6 shadow-council md:p-8"
      style={{ animation: "soft-rise 500ms ease-out both" }}
    >
      <p className="text-xs font-medium uppercase tracking-widest text-accent">
        Login
      </p>
      <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        {status === "loading" ? "Un momento." : "No se pudo iniciar sesion."}
      </h1>
      <p className="mt-4 leading-relaxed text-muted">{message}</p>
      {status === "error" && (
        <Link
          href={"/login" as never}
          className="mt-6 inline-flex text-sm text-accent-strong underline-offset-4 hover:underline"
        >
          Volver a intentar
        </Link>
      )}
    </div>
  );
}
