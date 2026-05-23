"use client";

import Link from "next/link";
import Image from "next/image";
import { AuthNavButton } from "@/components/auth/AuthNavButton";
import { Container } from "@/components/ui/Container";
import { Button, LinkButton } from "@/components/ui/Button";

const NAV = [
  { href: "#council", label: "Quiénes son" },
  { href: "#flujo", label: "Cómo es una sesión" },
  { href: "#ejemplo", label: "Un caso real" },
  { href: "#principios", label: "Lo que cuidamos" },
] as const;

interface HeaderProps {
  fixed?: boolean;
  onStart?: () => void;
}

export function Header({ fixed = false, onStart }: HeaderProps) {
  return (
    <header
      className={`${
        fixed ? "fixed inset-x-0 top-0" : "sticky top-0"
      } z-50 border-b border-border bg-background shadow-soft`}
    >
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

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <AuthNavButton />
          {onStart ? (
            <Button
              type="button"
              onClick={onStart}
              variant="primary"
              className="shrink-0 px-3 text-xs sm:px-5 sm:text-sm"
            >
              <span className="sm:hidden">Empezar</span>
              <span className="hidden sm:inline">Sentarme con ellos</span>
            </Button>
          ) : (
            <LinkButton
              href="/onboarding"
              variant="primary"
              className="shrink-0 px-3 text-xs sm:px-5 sm:text-sm"
            >
              <span className="sm:hidden">Empezar</span>
              <span className="hidden sm:inline">Sentarme con ellos</span>
            </LinkButton>
          )}
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
