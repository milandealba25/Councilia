import { type AgentId } from "@/lib/agents/ids";

interface Props {
  agent: AgentId;
  size?: number;
  className?: string;
  /** Si se pasa, se renderiza una etiqueta de rol bajo el avatar. */
  withCaption?: boolean;
  caption?: string;
}

const META: Record<
  AgentId,
  {
    initial: string;
    color: string;
    soft: string;
    ring: string;
    accentLine: string;
  }
> = {
  marco: {
    initial: "M",
    color: "var(--marco)",
    soft: "var(--marco-soft)",
    ring: "rgb(90 138 111 / 0.35)",
    accentLine: "rgb(90 138 111 / 0.55)",
  },
  elena: {
    initial: "E",
    color: "var(--elena)",
    soft: "var(--elena-soft)",
    ring: "rgb(217 154 43 / 0.40)",
    accentLine: "rgb(217 154 43 / 0.55)",
  },
  rafael: {
    initial: "R",
    color: "var(--rafael)",
    soft: "var(--rafael-soft)",
    ring: "rgb(196 80 58 / 0.38)",
    accentLine: "rgb(196 80 58 / 0.55)",
  },
};

/**
 * Avatar circular con identidad propia por agente: monograma + emblema
 * abstracto que codifica su función objetivo. Pensado para hero/council.
 */
export function AgentPortrait({
  agent,
  size = 88,
  className = "",
  withCaption = false,
  caption,
}: Props) {
  const meta = META[agent];

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <div
        className="relative inline-flex items-center justify-center rounded-full shadow-soft"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(120% 120% at 30% 25%, #ffffff 0%, ${meta.soft} 60%, ${meta.soft} 100%)`,
          boxShadow: `0 1px 0 0 rgb(255 255 255 / 0.7) inset, 0 0 0 1px ${meta.ring}, 0 10px 30px -12px rgb(124 70 45 / 0.25)`,
        }}
        aria-hidden
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 88 88"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0"
        >
          <defs>
            <linearGradient id={`ring-${agent}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={meta.color} stopOpacity="0.45" />
              <stop offset="100%" stopColor={meta.color} stopOpacity="0.12" />
            </linearGradient>
          </defs>
          <circle
            cx="44"
            cy="44"
            r="42"
            stroke={`url(#ring-${agent})`}
            strokeWidth="1.25"
            fill="none"
          />
        </svg>

        <span
          className="relative font-sans font-medium tracking-tight"
          style={{
            color: meta.color,
            fontSize: size * 0.42,
            lineHeight: 1,
          }}
        >
          {meta.initial}
        </span>

        <span
          className="absolute -right-1 -bottom-1 inline-flex items-center justify-center rounded-full bg-surface shadow-soft ring-1"
          style={{
            width: size * 0.32,
            height: size * 0.32,
            ["--tw-ring-color" as string]: meta.ring,
          }}
        >
          <Emblem agent={agent} color={meta.color} size={size * 0.18} />
        </span>
      </div>

      {withCaption && caption ? (
        <span
          className="font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ color: meta.color }}
        >
          {caption}
        </span>
      ) : null}
    </div>
  );
}

function Emblem({
  agent,
  color,
  size,
}: {
  agent: AgentId;
  color: string;
  size: number;
}) {
  const stroke = { stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (agent === "marco") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <path d="M2 11 L6 7 L9 9 L14 4" {...stroke} />
        <circle cx="14" cy="4" r="1.4" fill={color} />
      </svg>
    );
  }
  if (agent === "elena") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <line x1="8" y1="3" x2="8" y2="13" {...stroke} />
        <path d="M3 7 L8 4 L13 7" {...stroke} />
        <rect x="3" y="7" width="3.6" height="4.8" rx="0.8" stroke={color} strokeWidth="1.6" fill={color} fillOpacity="0.18" />
        <rect x="9.4" y="7" width="3.6" height="3.2" rx="0.8" stroke={color} strokeWidth="1.6" fill={color} fillOpacity="0.35" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M5.5 5.5 C5.5 3.8, 10.5 3.8, 10.5 6 C10.5 7.6, 8 7.6, 8 9.5" {...stroke} />
      <circle cx="8" cy="12.2" r="1.05" fill={color} />
    </svg>
  );
}
