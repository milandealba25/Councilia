"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SECTIONS = [
  { id: "inicio", label: "Inicio" },
  { id: "para-quien", label: "Para qué sirve" },
  { id: "council", label: "Quiénes son" },
  { id: "flujo", label: "Cómo es una sesión" },
  { id: "ejemplo", label: "Un caso real" },
  { id: "principios", label: "Lo que cuidamos" },
  { id: "empezar", label: "Empezar" },
] as const;

interface EnergyPulse {
  key: number;
  from: number;
  to: number;
}

export function SectionDotsNav() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [pulse, setPulse] = useState<EnergyPulse | null>(null);
  const activeIndexRef = useRef(0);
  const elementsRef = useRef<HTMLElement[]>([]);
  const programmaticScrollRef = useRef(false);
  const scrollFrameRef = useRef<number | null>(null);
  const scrollUnlockRef = useRef<number | null>(null);
  const pulseTimeoutRef = useRef<number | null>(null);
  const pulseKey = useRef(0);

  const setActiveSection = useCallback((nextIndex: number) => {
    const from = activeIndexRef.current;
    if (from === nextIndex) return;

    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);

    pulseKey.current += 1;
    const key = pulseKey.current;
    const distance = Math.abs(from - nextIndex);

    setPulse({ key, from, to: nextIndex });

    if (pulseTimeoutRef.current) {
      window.clearTimeout(pulseTimeoutRef.current);
    }

    pulseTimeoutRef.current = window.setTimeout(
      () => setPulse((current) => (current?.key === key ? null : current)),
      520 + distance * 72,
    );
  }, []);

  useEffect(() => {
    elementsRef.current = SECTIONS.map((section) =>
      document.getElementById(section.id),
    ).filter((element): element is HTMLElement => element !== null);

    function readActiveSection() {
      if (programmaticScrollRef.current) return;

      const marker = window.scrollY + window.innerHeight * 0.42;
      let nextIndex = 0;

      elementsRef.current.forEach((element, index) => {
        if (element.offsetTop - 96 <= marker) {
          nextIndex = index;
        }
      });

      setActiveSection(nextIndex);
    }

    function scheduleRead() {
      if (scrollFrameRef.current !== null) return;

      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        readActiveSection();
      });
    }

    readActiveSection();
    window.addEventListener("scroll", scheduleRead, { passive: true });
    window.addEventListener("resize", scheduleRead);

    return () => {
      window.removeEventListener("scroll", scheduleRead);
      window.removeEventListener("resize", scheduleRead);
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
      if (scrollUnlockRef.current) {
        window.clearTimeout(scrollUnlockRef.current);
      }
      if (pulseTimeoutRef.current) {
        window.clearTimeout(pulseTimeoutRef.current);
      }
    };
  }, [setActiveSection]);

  function goToSection(index: number) {
    const target = elementsRef.current[index] ?? document.getElementById(SECTIONS[index].id);
    if (!target) return;

    setActiveSection(index);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const distance = Math.abs(activeIndexRef.current - index);
    const unlockDelay = reduceMotion ? 120 : Math.min(1200, 520 + distance * 180);

    programmaticScrollRef.current = true;
    if (scrollUnlockRef.current) {
      window.clearTimeout(scrollUnlockRef.current);
    }
    scrollUnlockRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, unlockDelay);

    target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <nav
      aria-label="Secciones de la página"
      className="fixed right-7 top-1/2 z-40 hidden -translate-y-1/2 lg:block"
    >
      <div className="relative flex h-64 flex-col items-center justify-between rounded-full border border-border/60 bg-surface/72 px-2 py-3 shadow-soft backdrop-blur">
        <span
          aria-hidden
          className="absolute bottom-5 top-5 w-px rounded-full bg-border-strong/30"
        />

        {pulse && (
          <span
            key={pulse.key}
            aria-hidden
            className="section-dot-energy absolute w-px rounded-full bg-accent shadow-[0_0_14px_rgb(226_96_59_/_0.36)]"
            style={{
              top: `calc(1.25rem + ((100% - 2.5rem) / ${
                SECTIONS.length - 1
              }) * ${Math.min(pulse.from, pulse.to)})`,
              height: `calc(((100% - 2.5rem) / ${SECTIONS.length - 1}) * ${Math.abs(
                pulse.to - pulse.from,
              )})`,
              transformOrigin: pulse.to > pulse.from ? "top" : "bottom",
              animationDuration: `${420 + Math.abs(pulse.to - pulse.from) * 70}ms`,
            }}
          />
        )}

        {SECTIONS.map((section, index) => {
          const isActive = index === activeIndex;

          return (
            <button
              key={section.id}
              type="button"
              aria-label={section.label}
              aria-current={isActive ? "true" : undefined}
              onClick={() => goToSection(index)}
              className={`relative z-10 grid size-4 place-items-center rounded-full outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                isActive ? "scale-125" : "hover:scale-110"
              }`}
            >
              <span
                aria-hidden
                className={`block rounded-full border transition-all duration-500 ${
                  isActive
                    ? "size-3 border-accent bg-accent shadow-[0_0_0_4px_rgb(226_96_59_/_0.14),0_0_18px_rgb(226_96_59_/_0.32)]"
                    : "size-2.5 border-border-strong bg-surface"
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
