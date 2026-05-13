import { LegalLayout } from "@/components/legal/LegalLayout";
import { renderDocMarkdown } from "@/lib/markdown";
import { CookiePreferencesPanel } from "@/components/cookies/CookiePreferencesPanel";

export const metadata = {
  title: "Cookies · COUNCILia",
  description:
    "Qué cookies usamos, para qué, y cómo gestionar tus preferencias.",
};

export default async function CookiesPage() {
  const { html } = await renderDocMarkdown("13_politica_de_cookies.md");

  return (
    <LegalLayout
      eyebrow="Documento 13 · Cookies"
      title="Política de Cookies"
      description="Listado actualizado, categorías y control granular de tus preferencias."
      html={html}
      preamble={
        <div className="mb-8">
          <CookiePreferencesPanel />
        </div>
      }
    />
  );
}
