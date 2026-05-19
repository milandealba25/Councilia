import Link from "next/link";
import Image from "next/image";
import { AuthNavButton } from "@/components/auth/AuthNavButton";
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
    <header className="sticky top-0 z-40 border-b border-border bg-background shadow-soft">
      <Container className="flex h-16 items-center justify-between">
        <Link
          href="/"
          aria-label="Inicio · COUNCILia"
          className="group inline-flex items-center gap-0 font-sans text-[15px] font-semibold tracking-tight text-foreground"
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
          <AuthNavButton />
          <LinkButton
            href="/onboarding"
            variant="primary"
            className="px-3 sm:px-5"
          >
            Sentarme con ellos
          </LinkButton>
        </div>
      </Container>
    </header>
  );
}

function Mark() {
  return (
    <span
      className="-mr-1 grid size-10 shrink-0 place-items-center overflow-hidden"
      aria-hidden
    >
      <Image
        src="/brand-mark.png"
        alt=""
        className="size-9 object-contain"
        width={36}
        height={36}
      />
    </span>
  );
}
