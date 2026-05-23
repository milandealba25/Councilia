import { LegalLayout } from "@/components/legal/LegalLayout";
import { renderDocMarkdown } from "@/lib/markdown";

export const metadata = {
  title: "Términos",
  description:
    "Términos y condiciones de uso del servicio COUNCILia (MVP v1.1).",
};

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
