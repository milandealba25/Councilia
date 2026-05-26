import { LegalLayout } from "@/components/legal/LegalLayout";
import { renderDocMarkdown } from "@/lib/markdown";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Términos",
  description:
    "Términos y condiciones de uso del servicio COUNCILia (MVP v1.1).",
  path: "/terms",
});

export default async function TermsPage() {
  const { html } = await renderDocMarkdown("10_terminos_y_condiciones.md");

  return (
    <LegalLayout
      eyebrow="Documento 10 · Legal"
      title="Términos y Condiciones"
      html={html}
    />
  );
}
