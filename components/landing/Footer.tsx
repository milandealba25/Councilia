import { Container } from "@/components/ui/Container";

export function Footer() {
  return (
    <footer className="border-t border-border/60 py-12">
      <Container className="flex flex-col gap-6 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-sans text-foreground">COUNCILia</span>
          <span className="text-xs text-muted/80">
            © {new Date().getFullYear()} · MVP v1.1 · Pensar mejor, no saber más.
          </span>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs uppercase tracking-wider text-muted">
          <a href="#council" className="hover:text-foreground">
            Council
          </a>
          <a href="#flujo" className="hover:text-foreground">
            Flujo
          </a>
          <a href="#principios" className="hover:text-foreground">
            Principios
          </a>
          <a
            href="https://github.com/Councilia/Councilia/tree/main/docs"
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-foreground"
          >
            Docs
          </a>
        </nav>
      </Container>
    </footer>
  );
}
