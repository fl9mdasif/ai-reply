import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { Faq } from "./sections/Faq";
import { Features } from "./sections/Features";
import { FinalCta } from "./sections/FinalCta";
import { Hero } from "./sections/Hero";
import { HowItWorks } from "./sections/HowItWorks";
import { Pricing } from "./sections/Pricing";
import { ProblemSolution } from "./sections/ProblemSolution";
import { ProductTour } from "./sections/ProductTour";
import { Results } from "./sections/Results";
import { Roadmap } from "./sections/Roadmap";
import { TrustStrip } from "./sections/TrustStrip";

export default function LandingPage() {
  return (
    <div id="top" className="min-h-screen overflow-x-clip bg-background">
      <Navbar />
      <main>
        <Hero />
        <TrustStrip />
        <ProblemSolution />
        <HowItWorks />
        <Features />
        <ProductTour />
        <Results />
        <Roadmap />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
