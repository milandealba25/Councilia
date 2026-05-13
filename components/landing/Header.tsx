import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";

const NAV = [
  { href: "#council", label: "Quiénes son" },
  { href: "#flujo", label: "Cómo es una sesión" },
  { href: "#ejemplo", label: "Un caso real" },
  { href: "#principios", label: "Lo que cuidamos" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <Link
          href="/"
          aria-label="Inicio · COUNCILia"
          className="group inline-flex items-center gap-2.5 font-sans text-[15px] font-semibold tracking-tight text-foreground"
        >
          <Mark />
          <span>
            COUNCIL<span className="text-accent">ia</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-foreground-soft md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="relative transition-colors hover:text-accent-strong"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LinkButton href="/onboarding" variant="primary">
            Sentarme con ellos
          </LinkButton>
        </div>
      </Container>
    </header>
  );
}

function Mark() {
  return (
    <span className="inline-flex items-center gap-[3px]" aria-hidden>
      <span className="block size-1.5 rounded-full bg-marco" />
      <span className="block size-1.5 rounded-full bg-elena" />
      <span className="block size-1.5 rounded-full bg-rafael" />
    </span>
  );
}
