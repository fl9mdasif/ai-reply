"use client";

import Navbar from "@/components/sections/Navbar";
import HeroSection from "@/components/sections/HeroSection";
import LogoMarqueeSection from "@/components/sections/LogoMarqueeSection";
import MetricsSection from "@/components/sections/MetricsSection";
import ProblemSection from "@/components/sections/ProblemSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import PricingSection from "@/components/sections/PricingSection";
import FAQSection from "@/components/sections/FAQSection";
import CTASection from "@/components/sections/CTASection";
import SiteFooter from "@/components/sections/SiteFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <LogoMarqueeSection />
      <MetricsSection />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <SiteFooter />
    </div>
  );
}
