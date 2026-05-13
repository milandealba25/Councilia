import { type AgentId } from "@/lib/agents/ids";

type Mood = "calm" | "listening" | "thinking" | "speaking";

interface Props {
  agent: AgentId;
  size?: number;
  mood?: Mood;
  className?: string;
  /** Si es true, no se aplican animaciones (útil en imágenes de OG, PDF, etc.). */
  still?: boolean;
}

const META: Record<
  AgentId,
  {
    color: string;
    soft: string;
    ring: string;
    /** Pequeño matiz para diferenciar la silueta de cada cara. */
    accent: string;
    eyeShape: "round" | "smile" | "spark";
    browTilt: number;
    /** Desfase para evitar que los 3 parpadeen al unísono. */
    blinkDelay: number;
    floatDelay: number;
  }
> = {
  marco: {
    color: "var(--marco)",
    soft: "var(--marco-soft)",
    ring: "rgb(90 138 111 / 0.35)",
    accent: "rgb(90 138 111 / 0.20)",
    eyeShape: "smile",
    browTilt: -6,
    blinkDelay: 0,
    floatDelay: 0,
  },
  elena: {
    color: "var(--elena)",
    soft: "var(--elena-soft)",
    ring: "rgb(217 154 43 / 0.40)",
    accent: "rgb(217 154 43 / 0.22)",
    eyeShape: "round",
    browTilt: 0,
    blinkDelay: 1.4,
    floatDelay: 0.7,
  },
  rafael: {
    color: "var(--rafael)",
    soft: "var(--rafael-soft)",
    ring: "rgb(196 80 58 / 0.38)",
    accent: "rgb(196 80 58 / 0.22)",
    eyeShape: "spark",
    browTilt: 10,
    blinkDelay: 2.7,
    floatDelay: 1.3,
  },
};

/**
 * Rostros geométricos y discretos para los agentes. No son foto-realistas:
 * son siluetas amables que respiran, parpadean ocasionalmente y, cuando el
 * agente está "pensando", muestran tres puntos sutiles. La idea es que el
 * usuario sienta que hay alguien al otro lado, sin caer en lo caricaturesco.
 */
export function AgentFace({
  agent,
  size = 88,
  mood = "calm",
  className = "",
  still = false,
}: Props) {
  const meta = META[agent];
  const uid = `${agent}-${size}`;
  const animate = !still;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        animation: animate
          ? `face-float 7.5s ease-in-out ${meta.floatDelay}s infinite`
          : undefined,
      }}
      aria-hidden
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(120% 120% at 30% 25%, #ffffff 0%, ${meta.soft} 55%, ${meta.soft} 100%)`,
          boxShadow: `0 1px 0 0 rgb(255 255 255 / 0.75) inset, 0 0 0 1px ${meta.ring}, 0 10px 30px -12px rgb(124 70 45 / 0.25)`,
        }}
      />

      <svg
        viewBox="0 0 88 88"
        width={size}
        height={size}
        className="relative"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id={`face-fill-${uid}`} cx="0.32" cy="0.28" r="0.9">
            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="60%" stopColor={meta.soft} />
            <stop offset="100%" stopColor={meta.soft} />
          </radialGradient>
          <linearGradient id={`face-ring-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={meta.color} stopOpacity="0.55" />
            <stop offset="100%" stopColor={meta.color} stopOpacity="0.12" />
          </linearGradient>
        </defs>

        <g
          style={{
            transformOrigin: "44px 44px",
            animation: animate
              ? `face-breath 5.4s ease-in-out ${meta.floatDelay}s infinite`
              : undefined,
          }}
        >
          <circle
            cx="44"
            cy="44"
            r="33"
            fill={`url(#face-fill-${uid})`}
            stroke={`url(#face-ring-${uid})`}
            strokeWidth="1.25"
          />

          <Cheek cx={26} cy={52} color={meta.accent} />
          <Cheek cx={62} cy={52} color={meta.accent} />

          <g
            style={{
              transformBox: "fill-box",
              transformOrigin: "center",
              transform: `rotate(${meta.browTilt}deg)`,
            }}
          >
            <Brow x={28} color={meta.color} mood={mood} />
            <Brow x={52} color={meta.color} mood={mood} mirror />
          </g>

          <Eye
            cx={34}
            cy={42}
            color={meta.color}
            shape={meta.eyeShape}
            blinkDelay={meta.blinkDelay}
            animate={animate}
            mood={mood}
          />
          <Eye
            cx={54}
            cy={42}
            color={meta.color}
            shape={meta.eyeShape}
            blinkDelay={meta.blinkDelay + 0.05}
            animate={animate}
            mood={mood}
          />

          <Mouth color={meta.color} mood={mood} animate={animate} uid={uid} />

          {mood === "thinking" && (
            <ThoughtDots color={meta.color} animate={animate} />
          )}
        </g>
      </svg>
    </span>
  );
}

function Cheek({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return <circle cx={cx} cy={cy} r="5.4" fill={color} opacity="0.65" />;
}

function Brow({
  x,
  color,
  mood,
  mirror,
}: {
  x: number;
  color: string;
  mood: Mood;
  mirror?: boolean;
}) {
  const lift = mood === "listening" ? -2 : 0;
  const y = 33 + lift;
  const d = mirror
    ? `M ${x - 8} ${y + 1} Q ${x} ${y - 2.5} ${x + 8} ${y + 1}`
    : `M ${x - 8} ${y + 1} Q ${x} ${y - 2.5} ${x + 8} ${y + 1}`;
  return (
    <path
      d={d}
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      fill="none"
      opacity="0.55"
    />
  );
}

function Eye({
  cx,
  cy,
  color,
  shape,
  blinkDelay,
  animate,
  mood,
}: {
  cx: number;
  cy: number;
  color: string;
  shape: "round" | "smile" | "spark";
  blinkDelay: number;
  animate: boolean;
  mood: Mood;
}) {
  const blink =
    animate && mood !== "thinking"
      ? `face-blink 6.5s ease-in-out ${blinkDelay}s infinite`
      : undefined;

  const wrapStyle: React.CSSProperties = {
    transformBox: "fill-box",
    transformOrigin: "center",
    animation: blink,
  };

  if (shape === "smile") {
    return (
      <g style={wrapStyle}>
        <path
          d={`M ${cx - 3.4} ${cy + 0.6} Q ${cx} ${cy - 2.6} ${cx + 3.4} ${cy + 0.6}`}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    );
  }

  if (shape === "spark") {
    return (
      <g style={wrapStyle}>
        <circle cx={cx} cy={cy} r="2.1" fill={color} />
        <circle
          cx={cx + 1}
          cy={cy - 1}
          r="0.75"
          fill="white"
          opacity="0.85"
        />
      </g>
    );
  }

  return (
    <g style={wrapStyle}>
      <circle cx={cx} cy={cy} r="2.4" fill={color} />
      <circle cx={cx + 0.9} cy={cy - 0.9} r="0.7" fill="white" opacity="0.85" />
    </g>
  );
}

function Mouth({
  color,
  mood,
  animate,
  uid,
}: {
  color: string;
  mood: Mood;
  animate: boolean;
  uid: string;
}) {
  if (mood === "speaking") {
    return (
      <ellipse
        cx="44"
        cy="58"
        rx="4.5"
        ry="2.6"
        fill={color}
        opacity="0.85"
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          animation: animate
            ? `face-speak 0.55s ease-in-out infinite alternate`
            : undefined,
        }}
      >
        <title id={`mouth-${uid}`}>hablando</title>
      </ellipse>
    );
  }

  if (mood === "thinking") {
    return (
      <path
        d="M 38 59 Q 44 60 50 59"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
    );
  }

  if (mood === "listening") {
    return (
      <path
        d="M 37 57 Q 44 62.5 51 57"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  return (
    <path
      d="M 37.5 57.5 Q 44 61.5 50.5 57.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  );
}

function ThoughtDots({
  color,
  animate,
}: {
  color: string;
  animate: boolean;
}) {
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx={36 + i * 8}
          cy={71}
          r="1.6"
          fill={color}
          opacity="0.45"
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: animate
              ? `face-think 1.1s ease-in-out ${i * 0.18}s infinite`
              : undefined,
          }}
        />
      ))}
    </g>
  );
}
