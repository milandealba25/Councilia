"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveAuthSession } from "@/lib/auth/client";
import { resolvePostAuthRedirect } from "@/lib/auth/flow";

type Status = "loading" | "error";

export function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Estamos confirmando tu sesión.");

  useEffect(() => {
    async function finishLogin() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const expiresIn = Number(hash.get("expires_in") ?? "0");
      const next = normalizeNext(params.get("next"));
      const error =
        hash.get("error_description") ||
        hash.get("error") ||
        params.get("error_description") ||
        params.get("error");

      if (error) {
        setStatus("error");
        setMessage(error);
        return;
      }

      if (!accessToken) {
        setStatus("error");
        setMessage(
          "Supabase no devolvió un token de acceso. Revisa la URL de callback.",
        );
        return;
      }

      const response = await fetch("/api/auth/user", {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setStatus("error");
        setMessage(data?.error ?? "No pudimos validar tu sesión.");
        return;
      }

      const data = (await response.json()) as {
        user: { id: string; email: string };
      };
      saveAuthSession({
        accessToken,
        refreshToken,
        expiresAt: expiresIn > 0 ? Date.now() + expiresIn * 1000 : null,
        user: data.user,
      });
      const destination = await resolvePostAuthRedirect(next);
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
        {status === "loading" ? "Un momento." : "No se pudo iniciar sesión."}
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

function normalizeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
