import Link from "next/link";
import { Container } from "@/components/ui/Container";

const COLUMNS: Array<{
  title: string;
  links: Array<{ href: string; label: string }>;
}> = [
  {
    title: "Producto",
    links: [
      { href: "/#council", label: "El council" },
      { href: "/#flujo", label: "Cómo funciona" },
      { href: "/#ejemplo", label: "Un ejemplo" },
      { href: "/#principios", label: "Principios" },
      { href: "/onboarding", label: "Empezar" },
    ],
  },
  {
    title: "Sobre",
    links: [
      { href: "/about", label: "Sobre el producto" },
      { href: "/support", label: "Soporte y FAQ" },
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
        <div className="grid gap-10 md:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 font-sans text-[15px] font-semibold text-foreground"
            >
              <span className="inline-flex items-center gap-[3px]" aria-hidden>
                <span className="block size-1.5 rounded-full bg-marco" />
                <span className="block size-1.5 rounded-full bg-elena" />
                <span className="block size-1.5 rounded-full bg-rafael" />
              </span>
              <span>
                COUNCIL<span className="text-accent">ia</span>
              </span>
            </Link>
            <p className="max-w-xs text-[14px] leading-relaxed text-foreground-soft">
              Un council deliberativo. Tres voces que no convergen. Una síntesis
              que nombra tradeoffs en vez de recomendar.
            </p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-subtle">
              Pensar mejor, no saber más.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-subtle">
                {col.title}
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-foreground-soft transition-colors hover:text-accent-strong"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border/70 pt-6 text-xs leading-relaxed text-subtle md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} COUNCILia · Todos los derechos reservados.</span>
          <span className="max-w-md md:text-right">
            Si se detecta crisis emocional aguda, el producto se calla y entrega
            recursos profesionales verificados.
          </span>
        </div>
      </Container>
    </footer>
  );
}
