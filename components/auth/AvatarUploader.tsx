"use client";

import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  getValidAuthSession,
  updateAuthUser,
  type AuthSession,
} from "@/lib/auth/client";

interface AvatarUploaderProps {
  session: AuthSession;
  onSessionChange: (session: AuthSession) => void;
  variant?: "card" | "floating";
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024;

export function AvatarUploader({
  session,
  onSessionChange,
  variant = "card",
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    session.user.avatarUrl ?? null,
  );
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [uploadAttempted, setUploadAttempted] = useState(false);

  const initials = getInitials(session.user.name ?? session.user.email);
  const isLoading = status === "loading";

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setMessage(null);
    setImageFailed(false);
    setUploadAttempted(true);

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
      const currentSession = await getValidAuthSession();
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
      window.setTimeout(() => URL.revokeObjectURL(localPreview), 30_000);
      setStatus("idle");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const avatar = (
    <div
      className={
        variant === "floating"
          ? "grid size-28 shrink-0 place-items-center overflow-hidden rounded-full border border-[#e6c7b1] bg-[#fffaf4] text-2xl font-semibold text-accent-strong shadow-[0_18px_42px_rgba(116,68,43,0.18)] md:size-32"
          : "grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border border-[#e6c7b1] bg-[#fffaf4] text-xl font-semibold text-accent-strong shadow-[0_16px_34px_rgba(116,68,43,0.13)]"
      }
    >
      {previewUrl && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Foto de perfil"
          className="h-full w-full object-cover"
          onLoad={() => setImageFailed(false)}
          onError={(event) => {
            const failedSrc =
              event.currentTarget.currentSrc || event.currentTarget.src;
            if (failedSrc.startsWith("blob:")) return;

            setImageFailed(true);
            if (uploadAttempted) {
              setError(
                "La foto se guardó, pero el navegador no puede leer la URL pública. Revisa que el bucket user-avatars sea público.",
              );
            }
          }}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );

  if (variant === "floating") {
    return (
      <section className="flex flex-col items-center gap-3 text-center">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={handleFileChange}
        />

        <div className="group relative">
          <div className="absolute -inset-3 rounded-full bg-[conic-gradient(from_160deg,rgba(214,104,68,0.32),rgba(246,218,178,0.42),rgba(115,148,111,0.18),rgba(214,104,68,0.32))] opacity-80 blur-md transition duration-300 group-hover:opacity-100" />
          <div className="absolute -inset-1 rounded-full border border-white/65 bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" />
          <button
            type="button"
            className="relative block rounded-full outline-none transition duration-200 hover:scale-[1.02] focus-visible:ring-4 focus-visible:ring-accent/18"
            disabled={isLoading}
            aria-label="Cambiar foto de perfil"
            onClick={() => inputRef.current?.click()}
          >
            {avatar}
            <span className="absolute bottom-1 right-1 grid size-10 place-items-center rounded-full border border-white/80 bg-[#d86644] text-white shadow-[0_10px_22px_rgba(116,68,43,0.22)] transition group-hover:-translate-y-0.5">
              {isLoading ? <LoadingIcon /> : <CameraIcon />}
            </span>
          </button>
        </div>

        <div className="grid gap-1">
          <p className="text-sm font-semibold text-foreground">
            {isLoading ? "Subiendo foto..." : "Foto de perfil"}
          </p>
          <button
            type="button"
            className="text-xs font-medium text-accent-strong underline-offset-4 transition hover:text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={() => inputRef.current?.click()}
          >
            Cambiar imagen
          </button>
          <p className="text-[0.7rem] leading-relaxed text-muted">
            JPG, PNG o WebP · máximo 2 MB
          </p>
          {message && <p className="text-xs text-accent-strong">{message}</p>}
          {error && <p className="max-w-56 text-xs text-error">{error}</p>}
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-4 rounded-[1.2rem] border border-[#e2cdbb]/72 bg-white/42 p-5 shadow-soft backdrop-blur sm:grid-cols-[auto,1fr] sm:items-center lg:grid-cols-1">
      {avatar}

      <div className="grid gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Foto de perfil</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            JPG, PNG o WebP. Máximo 2 MB. Se verá en tu perfil y en la barra de chats.
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

function CameraIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3Z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function LoadingIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-30"
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}
