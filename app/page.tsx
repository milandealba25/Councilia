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

export default function Home() {
  return (
    <div className="relative isolate min-h-dvh overflow-x-hidden">
      <Header fixed />
      <SectionDotsNav />
      <main className="relative z-10">
        <div className="pt-16">
          <Hero />
        </div>
        <UseCasesSection />
        <CouncilSection />
        <FlowSection />
        <ExampleSection />
        <PrinciplesSection />
        <CTASection />
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
