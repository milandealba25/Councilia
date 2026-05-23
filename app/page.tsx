"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { AccountCheckOverlay } from "@/components/landing/AccountCheckOverlay";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { loadAuthSession } from "@/lib/auth/client";
import { resolvePostAuthRedirect } from "@/lib/auth/flow";

export default function Home() {
  const router = useRouter();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    async function routeActiveSession() {
      const session = loadAuthSession();
      if (!session) {
        setCheckingSession(false);
        return;
      }
      const destination = await resolvePostAuthRedirect("/session");
      router.replace(destination as never);
    }

    void routeActiveSession();
  }, [router]);

  return (
    <div
      className="relative isolate min-h-dvh overflow-x-hidden"
      aria-busy={checkingSession}
    >
      <AuroraBackground />
      <Header fixed onStart={() => setOverlayOpen(true)} />
      <SectionDotsNav />
      <main className="relative z-10">
        <div className="pt-16">
          <Hero onStart={() => setOverlayOpen(true)} />
        </div>
        <UseCasesSection />
        <CouncilSection />
        <FlowSection />
        <ExampleSection />
        <PrinciplesSection />
        <CTASection onStart={() => setOverlayOpen(true)} />
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
      <AccountCheckOverlay
        open={overlayOpen}
        onClose={() => setOverlayOpen(false)}
      />
    </div>
  );
}
