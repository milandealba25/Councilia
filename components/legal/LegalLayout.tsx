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
  preamble,
}: Props) {
  return (
    <>
      <Header />
      <main>
        <section className="border-b border-border/60 py-10 md:py-14">
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
            {preamble && <div className="mt-8">{preamble}</div>}
            <article
              className="legal-prose mt-6 md:mt-8"
              // El HTML proviene de markdown del repo (no del usuario).
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
