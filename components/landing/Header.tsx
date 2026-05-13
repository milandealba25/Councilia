import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-sans text-sm font-semibold tracking-tight text-foreground"
        >
          <Logo />
          <span>
            COUNCIL<span className="text-accent">ia</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-9 text-sm text-foreground-soft md:flex">
          <a
            href="#council"
            className="transition hover:text-accent-strong"
          >
            El council
          </a>
          <a
            href="#flujo"
            className="transition hover:text-accent-strong"
          >
            Cómo funciona
          </a>
          <a
            href="#principios"
            className="transition hover:text-accent-strong"
          >
            Principios
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/about"
            className="hidden text-sm text-foreground-soft transition hover:text-accent-strong md:inline-flex"
          >
            Sobre nosotros
          </Link>
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
    <span className="relative inline-flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-accent-soft via-elena-soft to-marco-soft ring-1 ring-border-strong/70 transition group-hover:scale-105">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <circle cx="6.5" cy="13" r="3" fill="var(--marco)" />
        <circle cx="12" cy="7" r="3" fill="var(--elena)" />
        <circle cx="17.5" cy="13" r="3" fill="var(--rafael)" />
      </svg>
    </span>
  );
}
