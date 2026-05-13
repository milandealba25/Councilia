"use client";

import { useEffect, useRef, useState } from "react";

const CHAR_MS = 52;
const IO_THRESHOLD = 0.18;

interface Props {
  color: string;
  text: string;
  /** Retraso antes del primer carácter (escalonar tarjetas visibles a la vez). */
  staggerMs?: number;
}

/**
 * Bloque "La pregunta que repite": la cita se revela mecanográficamente
 * cuando la tarjeta entra al viewport.
 */
export function AgentDominantQuestionField({
  color,
  text,
  staggerMs = 0,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        if (reduced) setDisplayed(text);
        setActive(true);
        io.disconnect();
      },
      { threshold: IO_THRESHOLD, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [text]);

  useEffect(() => {
    if (!active) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setDisplayed(text);
      return;
    }

    let i = 0;
    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        i += 1;
        setDisplayed(text.slice(0, i));
        if (i >= text.length && intervalId !== undefined) {
          window.clearInterval(intervalId);
          intervalId = undefined;
        }
      }, CHAR_MS);
    }, staggerMs);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [active, text, staggerMs]);

  const complete = displayed.length >= text.length && active;

  return (
    <div
      ref={rootRef}
      className="border-l-2 pl-3.5"
      style={{ borderColor: color }}
    >
      <p
        className="text-[10px] uppercase tracking-[0.16em]"
        style={{ color }}
      >
        La pregunta que repite
      </p>
      <div className="relative mt-1">
        <p
          className="invisible text-[14px] leading-relaxed italic break-words"
          aria-hidden
        >
          “{text}”
        </p>
        <p
          className="absolute left-0 top-0 text-[14px] leading-relaxed break-words text-foreground italic"
          aria-live={complete ? "off" : "polite"}
        >
          {active ? (
            <>
              “{displayed}”
              {!complete ? (
                <span
                  aria-hidden
                  className="ml-px inline-block h-[1.05em] w-px translate-y-px bg-current align-middle opacity-70 motion-safe:animate-pulse"
                />
              ) : null}
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
