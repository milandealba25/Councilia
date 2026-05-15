"use client";

import { useEffect, useRef, useState } from "react";

/** Ritmo mecanográfico (~2× el hero de landing para lectura más pausada). */
const CHAR_MS = 88;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

/**
 * Texto de agente que se revela mecanográficamente mientras llega el stream.
 * Si el servidor cierra el stream antes de que la mecanografía alcance el
 * final, sigue revelando hasta el último carácter (evita “solo la primera
 * oración” y luego el resto de golpe). Mensajes que nunca estuvieron en
 * streaming (historial) se muestran enteros al instante.
 */
export function StreamingAgentText({
  text,
  streaming,
  className = "",
  onRevealComplete,
}: {
  text: string;
  streaming: boolean;
  className?: string;
  /** Se llama una vez cuando el texto ya está revelado (stream terminado y mecanografía al día, o modo reducido). */
  onRevealComplete?: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState("");
  /** Hubo al menos un frame con `streaming` en este bloque de texto (turno vivo). */
  const wasLiveStreamRef = useRef(false);
  const revealNotifiedRef = useRef(false);

  useEffect(() => {
    if (streaming) wasLiveStreamRef.current = true;

    if (text.length === 0) {
      setShown("");
      if (!streaming) wasLiveStreamRef.current = false;
      return;
    }
    if (reduced) {
      setShown(text);
      return;
    }

    if (!wasLiveStreamRef.current) {
      setShown(text);
      return;
    }

    if (shown.length >= text.length) {
      if (!streaming) wasLiveStreamRef.current = false;
      return;
    }

    const id = window.setInterval(() => {
      setShown((prev) => {
        if (text.length < prev.length) return text;
        if (prev.length >= text.length) return prev;
        const gap = text.length - prev.length;
        const step = gap > 120 ? 5 : gap > 70 ? 3 : gap > 30 ? 2 : 1;
        return text.slice(0, prev.length + step);
      });
    }, CHAR_MS);

    return () => window.clearInterval(id);
  }, [text, streaming, reduced, shown]);

  useEffect(() => {
    if (!onRevealComplete || text.length === 0) return;
    if (streaming) {
      revealNotifiedRef.current = false;
      return;
    }
    if (reduced) {
      if (!revealNotifiedRef.current) {
        revealNotifiedRef.current = true;
        onRevealComplete();
      }
      return;
    }
    if (shown.length < text.length) return;
    if (!revealNotifiedRef.current) {
      revealNotifiedRef.current = true;
      onRevealComplete();
    }
  }, [onRevealComplete, streaming, text, reduced, shown]);

  const catchingUpAfterStream =
    !reduced &&
    wasLiveStreamRef.current &&
    shown.length < text.length &&
    !streaming;

  const showCaret =
    text.length > 0 &&
    !reduced &&
    shown.length < text.length &&
    (streaming || catchingUpAfterStream);

  return (
    <p
      className={className}
      aria-live={streaming || shown.length < text.length ? "polite" : "off"}
    >
      {shown}
      {showCaret ? (
        <span
          aria-hidden
          className="ml-px inline-block h-[1.05em] w-px translate-y-px bg-current align-middle opacity-70 motion-safe:animate-pulse"
        />
      ) : null}
    </p>
  );
}
