import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { CouncilSection } from "@/components/landing/CouncilSection";
import { FlowSection } from "@/components/landing/FlowSection";
import { PrinciplesSection } from "@/components/landing/PrinciplesSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <CouncilSection />
        <FlowSection />
        <PrinciplesSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
