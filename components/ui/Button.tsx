import Link from "next/link";
import { type ComponentProps, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-council px-5 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-background hover:bg-[color-mix(in_oklab,var(--accent)_85%,white)] shadow-council",
  secondary:
    "border border-border bg-elevated text-foreground hover:border-accent-muted hover:text-accent",
  ghost:
    "text-muted hover:text-foreground underline-offset-4 hover:underline",
};

interface CommonProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

type LinkButtonProps = CommonProps & {
  href: string;
  external?: boolean;
};

type NativeButtonProps = CommonProps &
  Omit<ComponentProps<"button">, "className" | "children">;

export function LinkButton({
  href,
  external,
  variant = "primary",
  className = "",
  children,
}: LinkButtonProps) {
  const classes = `${base} ${variants[variant]} ${className}`;
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={classes}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: NativeButtonProps) {
  return (
    <button
      {...rest}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
