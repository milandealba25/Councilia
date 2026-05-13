"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Retraso en ms; útil para escalonar entradas. */
  delay?: number;
  /** Distancia de translateY en píxeles (default: 12). */
  offset?: number;
  className?: string;
  /** `true` para mantener el efecto cada vez que entra al viewport. */
  repeat?: boolean;
  as?: "div" | "section" | "article" | "li" | "header";
}

/**
 * Animación discreta de entrada cuando el bloque alcanza el viewport.
 * Respeta `prefers-reduced-motion` y degrada a contenido visible siempre.
 */
export function Reveal({
  children,
  delay = 0,
  offset = 12,
  className = "",
  repeat = false,
  as = "div",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (!repeat) io.disconnect();
        } else if (repeat) {
          setVisible(false);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [repeat]);

  const Comp = as as "div";
  return (
    <Comp
      ref={ref}
      style={{
        transitionDelay: `${delay}ms`,
        transform: visible ? "translate3d(0,0,0)" : `translate3d(0, ${offset}px, 0)`,
      }}
      className={`transition-[opacity,transform] duration-700 ease-out will-change-transform ${
        visible ? "opacity-100" : "opacity-0"
      } ${className}`}
    >
      {children}
    </Comp>
  );
}
