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
        className={`council-aurora absolute -inset-[18%] opacity-[0.72] blur-[12px] ${
          showRadialMask ? "council-aurora-mask" : ""
        }`}
      />
      <div className="absolute inset-0 bg-background/42" />
    </div>
  );
}
