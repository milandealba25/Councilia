import { type AgentId } from "@/lib/agents/ids";

interface Props {
  agent: AgentId;
  size?: number;
  className?: string;
}

const SIZE_DEFAULT = 56;

const AGENT_COLOR: Record<AgentId, { stroke: string; fill: string; bg: string }> = {
  marco: {
    stroke: "var(--marco)",
    fill: "var(--marco)",
    bg: "var(--marco-soft)",
  },
  elena: {
    stroke: "var(--elena)",
    fill: "var(--elena)",
    bg: "var(--elena-soft)",
  },
  rafael: {
    stroke: "var(--rafael)",
    fill: "var(--rafael)",
    bg: "var(--rafael-soft)",
  },
};

/**
 * Avatares SVG sobrios y geométricos para los 3 agentes (B3).
 * Cada figura codifica visualmente su función objetivo:
 *  - Marco (Estratega): horizonte / escala temporal.
 *  - Elena (Riesgo): balanza / asimetría.
 *  - Rafael (Crítico): interrogación / corte.
 */
export function AgentAvatar({ agent, size = SIZE_DEFAULT, className = "" }: Props) {
  const c = AGENT_COLOR[agent];
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 64 64",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    className,
    "aria-hidden": true as const,
  };

  if (agent === "marco") {
    return (
      <svg {...props}>
        <rect width="64" height="64" rx="16" fill={c.bg} />
        <rect
          x="0.75"
          y="0.75"
          width="62.5"
          height="62.5"
          rx="15.25"
          stroke={c.stroke}
          strokeOpacity="0.35"
          strokeWidth="1"
        />
        <path
          d="M12 44 L24 30 L34 36 L52 18"
          stroke={c.stroke}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="52" cy="18" r="3" fill={c.fill} />
        <line
          x1="12"
          y1="50"
          x2="52"
          y2="50"
          stroke={c.stroke}
          strokeOpacity="0.4"
          strokeWidth="1"
        />
      </svg>
    );
  }

  if (agent === "elena") {
    return (
      <svg {...props}>
        <rect width="64" height="64" rx="16" fill={c.bg} />
        <rect
          x="0.75"
          y="0.75"
          width="62.5"
          height="62.5"
          rx="15.25"
          stroke={c.stroke}
          strokeOpacity="0.35"
          strokeWidth="1"
        />
        <line
          x1="32"
          y1="14"
          x2="32"
          y2="44"
          stroke={c.stroke}
          strokeWidth="1.5"
        />
        <path
          d="M16 30 L32 18 L48 30"
          stroke={c.stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <rect
          x="14"
          y="30"
          width="10"
          height="14"
          rx="2"
          fill={c.fill}
          fillOpacity="0.22"
          stroke={c.stroke}
          strokeWidth="1.5"
        />
        <rect
          x="40"
          y="30"
          width="10"
          height="8"
          rx="2"
          fill={c.fill}
          fillOpacity="0.4"
          stroke={c.stroke}
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  return (
    <svg {...props}>
      <rect width="64" height="64" rx="16" fill={c.bg} />
      <rect
        x="0.75"
        y="0.75"
        width="62.5"
        height="62.5"
        rx="15.25"
        stroke={c.stroke}
        strokeOpacity="0.35"
        strokeWidth="1"
      />
      <path
        d="M24 22 C24 16, 40 16, 40 24 C40 30, 32 30, 32 36"
        stroke={c.stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="32" cy="44" r="3" fill={c.fill} />
    </svg>
  );
}
