import Link from "next/link";
import { Container } from "@/components/ui/Container";

const COLUMNS: Array<{
  title: string;
  links: Array<{ href: string; label: string; external?: boolean }>;
}> = [
  {
    title: "Producto",
    links: [
      { href: "/#council", label: "El council" },
      { href: "/#flujo", label: "Cómo funciona" },
      { href: "/#principios", label: "Principios" },
      { href: "/onboarding", label: "Empezar" },
    ],
  },
  {
    title: "Compañía",
    links: [
      { href: "/about", label: "Sobre el producto" },
      { href: "/support", label: "Soporte y FAQ" },
      {
        href: "https://github.com/Councilia/Councilia",
        label: "Repositorio",
        external: true,
      },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Términos" },
      { href: "/privacy", label: "Privacidad" },
      { href: "/cookies", label: "Cookies" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-surface-soft/40 py-16">
      <Container>
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-sans text-sm font-semibold text-foreground"
            >
              <span className="relative inline-flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-accent-soft via-elena-soft to-marco-soft ring-1 ring-border-strong/70">
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
              <span>
                COUNCIL<span className="text-accent">ia</span>
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-foreground-soft">
              Un council deliberativo: tres posturas incompatibles, una síntesis
              que nombra tradeoffs.
            </p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-subtle">
              MVP v1.1 · Pensar mejor, no saber más.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-subtle">
                {col.title}
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-sm">
                {col.links.map((link) =>
                  link.external ? (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-foreground-soft transition hover:text-accent-strong"
                      >
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-foreground-soft transition hover:text-accent-strong"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-border/70 pt-6 text-xs leading-relaxed text-subtle">
          © {new Date().getFullYear()} COUNCILia. Cuando se detecta crisis
          emocional aguda, el producto se calla y entrega recursos profesionales.
        </div>
      </Container>
    </footer>
  );
}
