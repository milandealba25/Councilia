import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { UseCasesSection } from "@/components/landing/UseCasesSection";
import { CouncilSection } from "@/components/landing/CouncilSection";
import { FlowSection } from "@/components/landing/FlowSection";
import { ExampleSection } from "@/components/landing/ExampleSection";
import { PrinciplesSection } from "@/components/landing/PrinciplesSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";
import { AuroraBackground } from "@/components/ui/AuroraBackground";

export default function Home() {
  return (
    <div className="relative isolate min-h-dvh overflow-x-hidden">
      <AuroraBackground />
      <Header />
      <main className="relative z-10">
        <Hero />
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
