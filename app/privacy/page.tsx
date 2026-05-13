import { LegalLayout } from "@/components/legal/LegalLayout";
import { renderDocMarkdown } from "@/lib/markdown";

export const metadata = {
  title: "Privacidad · COUNCILia",
  description:
    "Cómo recolectamos, usamos y protegemos los datos en COUNCILia.",
};

export default async function PrivacyPage() {
  const { html } = await renderDocMarkdown("12_politica_de_privacidad.md");

  return (
    <LegalLayout
      eyebrow="Documento 12 · Privacidad"
      title="Política de Privacidad"
      description="Qué datos guardamos, durante cuánto tiempo y cómo ejerces tus derechos."
      html={html}
    />
  );
}
