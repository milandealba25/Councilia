import { LegalLayout } from "@/components/legal/LegalLayout";
import { renderDocMarkdown } from "@/lib/markdown";

export const metadata = {
  title: "Sobre el producto",
  description:
    "Visión, principios y diferenciador defendible de COUNCILia.",
};

export default async function AboutPage() {
  const { html } = await renderDocMarkdown("01_vision.md");
  return (
    <LegalLayout
      eyebrow="Documento 01 · Visión"
      title="Sobre COUNCILia"
      description="No competimos en respuestas correctas. Competimos en experiencia cognitivamente diferente."
      html={html}
    />
  );
}
