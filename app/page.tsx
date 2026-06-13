import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { UseCasesSection } from "@/components/landing/UseCasesSection";
import { CouncilSection } from "@/components/landing/CouncilSection";
import { FlowSection } from "@/components/landing/FlowSection";
import { ExampleSection } from "@/components/landing/ExampleSection";
import { PrinciplesSection } from "@/components/landing/PrinciplesSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";
import { SectionDotsNav } from "@/components/landing/SectionDotsNav";
import { getPublicAppUrl } from "@/lib/appUrl";
import { pageMetadata, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "IA para pensar decisiones difíciles",
  description: SITE_DESCRIPTION,
  path: "/",
});

export default function Home() {
  const baseUrl = getPublicAppUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: SITE_NAME,
        url: baseUrl,
        logo: `${baseUrl}/brand-mark.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        name: SITE_NAME,
        url: baseUrl,
        inLanguage: "es-MX",
        publisher: { "@id": `${baseUrl}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${baseUrl}/#app`,
        name: SITE_NAME,
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web",
        url: baseUrl,
        description: SITE_DESCRIPTION,
        inLanguage: "es-MX",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "MXN",
        },
      },
    ],
  };

  return (
    <div className="relative isolate min-h-dvh overflow-x-hidden">
      <Header fixed />
      <SectionDotsNav />
      <main className="relative z-10">
        <div className="pt-16">
          <Hero />
        </div>
        <div className="relative bg-[rgba(251,246,237,0.9)] backdrop-blur-[2px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-16 h-16 bg-gradient-to-b from-transparent to-[rgba(251,246,237,0.9)]"
          />
          <UseCasesSection />
          <CouncilSection />
          <FlowSection />
          <ExampleSection />
          <PrinciplesSection />
          <CTASection />
        </div>
      </main>
      <div className="relative z-10 bg-[rgba(251,246,237,0.9)] backdrop-blur-[2px]">
        <Footer />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </div>
  );
}
