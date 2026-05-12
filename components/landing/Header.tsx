import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <Container className="flex h-14 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-sans text-sm font-semibold tracking-tight text-foreground"
        >
          <Logo />
          COUNCILia
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a
            href="#council"
            className="transition hover:text-foreground"
          >
            El council
          </a>
          <a
            href="#flujo"
            className="transition hover:text-foreground"
          >
            Cómo funciona
          </a>
          <a
            href="#principios"
            className="transition hover:text-foreground"
          >
            Principios
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <LinkButton href="/onboarding" variant="primary">
            Empezar
          </LinkButton>
        </div>
      </Container>
    </header>
  );
}

function Logo() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="6" cy="12" r="3" fill="var(--accent)" />
      <circle cx="12" cy="6" r="3" fill="var(--tension)" />
      <circle cx="18" cy="12" r="3" fill="var(--error)" />
      <path
        d="M6 12 L12 6 L18 12"
        stroke="var(--text-muted)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
