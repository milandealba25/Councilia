"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  renderSynthesisMarkdown,
  type Synthesis,
} from "@/orchestrator/synthesis";

interface Props {
  synthesis: Synthesis;
}

/**
 * E1 · Renderiza la síntesis con la estructura fija documentada en doc 05 §3.3.
 * No es prosa libre: nodos predecibles + exportación a markdown (E3) y PDF nativo (E2).
 */
export function SynthesisCard({ synthesis }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyMarkdown() {
    const md = renderSynthesisMarkdown(synthesis);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    }
  }

  return (
    <article
      data-print="synthesis"
      className="relative flex flex-col gap-6 rounded-council border border-accent/50 bg-elevated p-7 shadow-council print:border-black print:bg-white print:text-black print:shadow-none"
    >
      <span
        className="absolute -top-3 left-6 inline-flex items-center gap-2 rounded-full border border-accent bg-background px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-accent print:hidden"
        aria-hidden
      >
        Fase 4 · Síntesis
      </span>

      <header className="pt-1">
        <h2 className="font-sans text-xl font-semibold tracking-tight text-foreground print:text-2xl">
          La sesión cierra aquí.
        </h2>
        <p className="mt-1 text-xs text-muted print:hidden">
          La síntesis nombra tradeoffs, no recomienda. Tú decides al final.
        </p>
      </header>

      <Block title="Caminos visibles">
        <ul className="flex flex-col gap-2 text-sm leading-relaxed">
          {synthesis.paths.map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-muted">·</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Tradeoffs irreductibles">
        <ul className="flex flex-col gap-2 text-sm leading-relaxed">
          {synthesis.tradeoffs.map((t, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-tension">×</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Lo que esto te pide decidir">
        <p className="text-sm leading-relaxed text-foreground/90">
          {synthesis.closing}
        </p>
      </Block>

      <div className="flex flex-wrap gap-3 border-t border-border/60 pt-5 print:hidden">
        <Button variant="secondary" onClick={copyMarkdown}>
          {copied ? "Copiado" : "Copiar markdown"}
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>
          Exportar a PDF
        </Button>
      </div>
    </article>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="font-mono text-[11px] font-medium uppercase tracking-widest text-muted print:text-black">
        {title}
      </h3>
      <div className="mt-2 text-foreground print:text-black">{children}</div>
    </section>
  );
}
