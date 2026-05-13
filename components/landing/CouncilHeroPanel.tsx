"use client";

import Link from "next/link";
import { AgentFace } from "@/components/agents/AgentFace";
import { TypewriterText } from "@/components/landing/TypewriterText";
import {
  AGENT_LABELS,
  AGENT_ROLES,
  AGENT_IDS,
  type AgentId,
} from "@/lib/agents/ids";

const HERO_WHISPERS: Record<AgentId, string> = {
  marco: "Pienso en quién serás dentro de dos años si dices que sí.",
  elena: "Imaginemos lo peor con calma, y veamos cuánto duele.",
  rafael: "¿Y si hay algo que aún no te has atrevido a preguntar?",
};

function quoted(whisper: string) {
  return `\u201C${whisper}\u201D`;
}

export function CouncilHeroPanel() {
  return (
    <div className="relative mx-auto hidden h-full w-full max-w-md lg:block">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -m-6 rounded-council-xl opacity-90 blur-2xl"
        style={{
          background:
            "radial-gradient(900px 500px at 80% 10%, rgb(226 96 59 / 0.2), transparent 60%), radial-gradient(800px 480px at 10% 30%, rgb(217 154 43 / 0.2), transparent 65%)",
        }}
      />

      <div className="relative overflow-hidden rounded-council-xl border border-border-strong/40 bg-surface/85 shadow-council-lg backdrop-blur">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-foreground-soft">
            <span className="size-1.5 rounded-full bg-accent" />
            Tu council, en silencio
          </div>
          <div className="text-[10px] tabular-nums text-subtle">
            Te están escuchando
          </div>
        </div>

        <ul className="flex flex-col">
          {AGENT_IDS.map((agent, idx) => (
            <li
              key={agent}
              className="flex items-start gap-4 border-b border-border/60 px-5 py-5 last:border-b-0"
              style={{
                animation: `soft-rise 700ms ease-out ${idx * 160}ms both`,
              }}
            >
              <AgentFace agent={agent} size={56} mood="listening" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {AGENT_LABELS[agent]}
                  </span>
                  <span
                    className="text-[10px] uppercase tracking-[0.16em]"
                    style={{
                      color: `var(--${agent})`,
                    }}
                  >
                    {AGENT_ROLES[agent]}
                  </span>
                </div>
                <div className="mt-1.5">
                  <TypewriterText
                    text={quoted(HERO_WHISPERS[agent])}
                    staggerMs={idx * 220}
                    className="text-[13.5px] italic leading-relaxed text-foreground-soft"
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 border-t border-border/70 bg-surface-soft/60 px-5 py-3.5">
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-surface ring-1 ring-border-strong/70 text-[11px] text-foreground-soft">
            Tú
          </span>
          <Link
            href="/onboarding"
            className="flex-1 text-left text-sm text-foreground-soft transition-colors hover:text-accent-strong"
          >
            Cuéntales lo que te tiene así…
          </Link>
        </div>
      </div>
    </div>
  );
}
