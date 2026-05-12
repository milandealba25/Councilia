import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";

export const metadata = {
  title: "404 · COUNCILia",
};

export default function NotFound() {
  return (
    <main className="min-h-dvh">
      <Container className="flex min-h-dvh max-w-3xl flex-col justify-center py-20">
        <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
          404 · página no encontrada
        </p>
        <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Aquí no hay nada que deliberar.
        </h1>
        <p className="mt-5 max-w-xl leading-relaxed text-muted">
          La página que buscas no existe o se movió. Puedes volver al inicio o
          reunir tu council desde cero.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <LinkButton href="/">Volver al inicio</LinkButton>
          <LinkButton href="/onboarding" variant="secondary">
            Reunir mi council
          </LinkButton>
        </div>
        <p className="mt-16 text-xs text-muted">
          ¿Llegaste a esto desde un enlace nuestro?{" "}
          <Link
            href="/support"
            className="text-accent underline-offset-4 hover:underline"
          >
            Avísanos en soporte
          </Link>
          .
        </p>
      </Container>
    </main>
  );
}
