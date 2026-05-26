"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { resolvePostAuthRedirect } from "@/lib/auth/flow";

interface StartAccessProps {
  children: ReactNode;
  className?: string;
}

interface StartAccessButtonProps extends StartAccessProps {
  variant?: "primary" | "secondary" | "ghost";
}

function useStartAccess() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    router.prefetch("/login?next=/session");
    router.prefetch("/session");
    router.prefetch("/onboarding");
  }, [router]);

  return {
    pending,
    start: useCallback(async () => {
      if (pending) return;
      setPending(true);
      try {
        const destination = await resolvePostAuthRedirect("/session");
        router.push(
          (destination === "/login" ? "/login?next=/session" : destination) as never,
        );
      } catch {
        router.push("/login?next=/session" as never);
      }
    }, [pending, router]),
  };
}

export function StartAccessButton({
  children,
  className = "",
  variant = "primary",
}: StartAccessButtonProps) {
  const { pending, start } = useStartAccess();
  return (
    <Button
      type="button"
      onClick={start}
      variant={variant}
      className={className}
      aria-busy={pending}
      disabled={pending}
    >
      {children}
    </Button>
  );
}

export function StartAccessInlineButton({
  children,
  className = "",
}: StartAccessProps) {
  const { pending, start } = useStartAccess();
  return (
    <button
      type="button"
      onClick={start}
      className={className}
      aria-busy={pending}
      disabled={pending}
    >
      {children}
    </button>
  );
}
