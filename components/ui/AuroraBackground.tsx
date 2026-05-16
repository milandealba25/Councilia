interface AuroraBackgroundProps {
  className?: string;
  showRadialMask?: boolean;
}

export function AuroraBackground({
  className = "",
  showRadialMask = false,
}: AuroraBackgroundProps) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`}
    >
      <div
        className={`council-aurora absolute -inset-[18%] opacity-80 blur-[11px] ${
          showRadialMask ? "council-aurora-mask" : ""
        }`}
      />
      <div className="absolute inset-0 bg-background/34" />
    </div>
  );
}
