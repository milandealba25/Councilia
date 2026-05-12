import { type AgentId } from "@/lib/agents/ids";

interface Props {
  agent: AgentId;
  size?: number;
  className?: string;
}

const SIZE_DEFAULT = 56;

/**
 * Avatares SVG sobrios y geom\u00e9tricos para los 3 agentes (B3).
 * Cada figura codifica visualmente su funci\u00f3n objetivo:
 *  - Marco (Estratega): horizonte/escala temporal.
 *  - Elena (Riesgo): asimetr\u00eda / pesos.
 *  - Rafael (Cr\u00edtico): interrogaci\u00f3n / corte.
 */
export function AgentAvatar({ agent, size = SIZE_DEFAULT, className = "" }: Props) {
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
        <rect width="64" height="64" rx="14" fill="var(--surface-elevated)" />
        <rect
          x="0.75"
          y="0.75"
          width="62.5"
          height="62.5"
          rx="13.25"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <path
          d="M12 42 L24 30 L34 36 L52 18"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="52" cy="18" r="2.5" fill="var(--accent)" />
        <line
          x1="12"
          y1="48"
          x2="52"
          y2="48"
          stroke="var(--border)"
          strokeWidth="1"
        />
      </svg>
    );
  }

  if (agent === "elena") {
    return (
      <svg {...props}>
        <rect width="64" height="64" rx="14" fill="var(--surface-elevated)" />
        <rect
          x="0.75"
          y="0.75"
          width="62.5"
          height="62.5"
          rx="13.25"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <line
          x1="32"
          y1="14"
          x2="32"
          y2="44"
          stroke="var(--tension)"
          strokeWidth="1.5"
        />
        <path
          d="M16 30 L32 18 L48 30"
          stroke="var(--tension)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <rect x="14" y="30" width="10" height="14" rx="2" fill="var(--tension)" fillOpacity="0.18" stroke="var(--tension)" strokeWidth="1.5" />
        <rect x="40" y="30" width="10" height="8" rx="2" fill="var(--tension)" fillOpacity="0.32" stroke="var(--tension)" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <svg {...props}>
      <rect width="64" height="64" rx="14" fill="var(--surface-elevated)" />
      <rect
        x="0.75"
        y="0.75"
        width="62.5"
        height="62.5"
        rx="13.25"
        stroke="var(--border)"
        strokeWidth="1"
      />
      <path
        d="M24 22 C24 16, 40 16, 40 24 C40 30, 32 30, 32 36"
        stroke="var(--error)"
        strokeWidth="2.25"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="32" cy="44" r="2.5" fill="var(--error)" />
    </svg>
  );
}
