import { NavBar } from "@/components/layout/NavBar";
import { Hero } from "@/components/landing/Hero";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { FlowDiagram } from "@/components/landing/FlowDiagram";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { GoldenSignals } from "@/components/landing/GoldenSignals";
import { OutcomePillars } from "@/components/landing/OutcomePillars";
import { StackSection } from "@/components/landing/StackSection";
import { ClosingCTA } from "@/components/landing/ClosingCTA";
import { Footer } from "@/components/landing/Footer";
import { SmoothScroll } from "@/components/SmoothScroll";

export function LandingPage() {
  return (
    <SmoothScroll>
      <NavBar />
      <Hero />
      <ProblemSection />
      <FlowDiagram />
      <HowItWorks />
      <GoldenSignals />
      <OutcomePillars />
      <StackSection />
      <ClosingCTA />
      <Footer />
    </SmoothScroll>
  );
}
