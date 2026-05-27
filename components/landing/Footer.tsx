import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { StartAccessInlineButton } from "@/components/landing/StartAccessButton";

const COLUMNS: Array<{
  title: string;
  links: Array<{ href: string; label: string; startAction?: boolean }>;
}> = [
  {
    title: "Conocer",
    links: [
      { href: "/#council", label: "Quiénes son" },
      { href: "/#flujo", label: "Cómo es una sesión" },
      { href: "/#ejemplo", label: "Un caso real" },
      { href: "/#principios", label: "Lo que cuidamos" },
      {
        href: "/login?next=/session",
        label: "Sentarme con ellos",
        startAction: true,
      },
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
              className="inline-flex items-center gap-0 font-sans text-[15px] font-semibold text-foreground"
            >
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
              <span>
                COUNCIL<span className="text-accent">ia</span>
              </span>
            </Link>
            <p className="max-w-xs text-[14px] leading-relaxed text-foreground-soft">
              Tres voces que te ayudan a pensar lo que estás eligiendo. Sin
              empujarte, sin darte la razón a la fuerza.
            </p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-subtle">
              Pensar mejor, no saber más.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-subtle">
                {col.title}
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-sm">
                {col.links.map((link) => (
                  <li key={`${link.href}-${link.label}`}>
                    {link.startAction ? (
                      <StartAccessInlineButton
                        className="text-left text-foreground-soft transition-colors hover:text-accent-strong"
                      >
                        {link.label}
                      </StartAccessInlineButton>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-foreground-soft transition-colors hover:text-accent-strong"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border/70 pt-6 text-xs leading-relaxed text-subtle md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} COUNCILia · Todos los derechos reservados.</span>
          <span className="max-w-md md:text-right">
            Si algo duele mucho durante una sesión, el council se calla y te
            comparte recursos profesionales verificados. Tu bienestar pesa más
            que la conversación.
          </span>
        </div>
      </Container>
    </footer>
  );
}
