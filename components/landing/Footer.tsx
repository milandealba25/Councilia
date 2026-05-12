import Link from "next/link";
import { Container } from "@/components/ui/Container";

const COLUMNS: Array<{ title: string; links: Array<{ href: string; label: string; external?: boolean }> }> = [
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
    <footer className="border-t border-border/60 py-16">
      <Container>
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="flex flex-col gap-3">
            <span className="font-sans text-sm font-semibold text-foreground">
              COUNCILia
            </span>
            <p className="max-w-xs text-sm leading-relaxed text-muted">
              Un council deliberativo: tres posturas incompatibles, una síntesis
              que nombra tradeoffs.
            </p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted/70">
              MVP v1.1 · Pensar mejor, no saber más.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-muted">
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
                        className="text-muted transition hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-muted transition hover:text-foreground"
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

        <div className="mt-12 border-t border-border/60 pt-6 text-xs text-muted/80">
          © {new Date().getFullYear()} COUNCILia. Cuando se detecta crisis
          emocional aguda, el producto se calla y entrega recursos profesionales.
        </div>
      </Container>
    </footer>
  );
}
