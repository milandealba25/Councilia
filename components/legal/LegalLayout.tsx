import Link from "next/link";
import { type ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

interface Props {
  eyebrow: string;
  title: string;
  description?: string;
  lastUpdated?: string;
  /** HTML renderizado del documento (renderDocMarkdown). */
  html: string;
  /** Otras páginas legales para enlace cruzado. */
  related?: Array<{ href: string; label: string }>;
  /** Sirve por si la página necesita inyectar algo antes del cuerpo. */
  preamble?: ReactNode;
}

/**
 * Layout reutilizable para /terms, /privacy, /cookies, /about y /support.
 * Tipografía cómoda para lectura larga, anclas por sección, sin distracción.
 */
export function LegalLayout({
  eyebrow,
  title,
  description,
  lastUpdated,
  html,
  related,
  preamble,
}: Props) {
  return (
    <>
      <Header />
      <main>
        <section className="border-b border-border/60 py-16 md:py-20">
          <Container className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-widest text-accent">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="mt-4 max-w-2xl leading-relaxed text-muted">
                {description}
              </p>
            )}
            {lastUpdated && (
              <p className="mt-4 font-mono text-xs uppercase tracking-wider text-muted/70">
                Última actualización: {lastUpdated}
              </p>
            )}
          </Container>
        </section>

        <section className="py-16 md:py-20">
          <Container className="max-w-3xl">
            {preamble}
            <article
              className="legal-prose"
              // El HTML proviene de markdown del repo (no del usuario).
              dangerouslySetInnerHTML={{ __html: html }}
            />

            {related && related.length > 0 && (
              <aside className="mt-16 border-t border-border/60 pt-8">
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
                  También te puede interesar
                </p>
                <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  {related.map((r) => (
                    <li key={r.href}>
                      <Link
                        href={r.href}
                        className="text-foreground underline-offset-4 hover:underline"
                      >
                        {r.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
