"use client";

import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  loadAuthSession,
  updateAuthUser,
  type AuthSession,
} from "@/lib/auth/client";

interface AvatarUploaderProps {
  session: AuthSession;
  onSessionChange: (session: AuthSession) => void;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024;

export function AvatarUploader({
  session,
  onSessionChange,
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    session.user.avatarUrl ?? null,
  );
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  const initials = getInitials(session.user.name ?? session.user.email);
  const isLoading = status === "loading";

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setMessage(null);
    setImageFailed(false);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Usa una imagen JPG, PNG o WebP.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("La imagen debe pesar máximo 2 MB.");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setStatus("loading");

    try {
      const currentSession = loadAuthSession();
      if (!currentSession) {
        throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
      }

      const formData = new FormData();
      formData.set("avatar", file);

      const response = await fetch("/api/auth/avatar", {
        method: "POST",
        headers: {
          authorization: `Bearer ${currentSession.accessToken}`,
        },
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        user?: { avatarUrl?: string | null };
      } | null;

      if (!response.ok || !data?.user?.avatarUrl) {
        throw new Error(data?.error ?? "No pudimos subir la foto.");
      }

      const nextSession = updateAuthUser({
        avatarUrl: data.user.avatarUrl,
      });
      if (nextSession) {
        onSessionChange(nextSession);
      }
      setPreviewUrl(data.user.avatarUrl);
      setMessage("Foto actualizada.");
    } catch (err) {
      setPreviewUrl(session.user.avatarUrl ?? null);
      setImageFailed(false);
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos subir la foto. Inténtalo de nuevo.",
      );
    } finally {
      URL.revokeObjectURL(localPreview);
      setStatus("idle");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="grid gap-4 rounded-council border border-border/70 bg-elevated/40 p-4 sm:grid-cols-[auto,1fr] sm:items-center">
      <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-surface text-lg font-semibold text-accent-strong shadow-soft">
        {previewUrl && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Foto de perfil"
            className="h-full w-full object-cover"
            onError={() => {
              setImageFailed(true);
              setError(
                "La foto se guardó, pero el navegador no puede leer la URL pública. Revisa que el bucket user-avatars sea público.",
              );
            }}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      <div className="grid gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Foto de perfil</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            JPG, PNG o WebP. Máximo 2 MB.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="secondary"
            className="px-4"
            disabled={isLoading}
            onClick={() => inputRef.current?.click()}
          >
            {isLoading ? "Subiendo..." : "Subir foto"}
          </Button>
          {message && <p className="text-sm text-accent-strong">{message}</p>}
          {error && <p className="text-sm text-error">{error}</p>}
        </div>
      </div>
    </section>
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
