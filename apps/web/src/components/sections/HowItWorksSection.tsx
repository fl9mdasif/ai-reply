"use client";

import { useTranslations } from "next-intl";
import Reveal from "@/components/ui/Reveal";

export default function HowItWorksSection() {
  const t = useTranslations();
  const steps = t.raw("howItWorks.steps") as Array<{
    num: string;
    title: string;
    body: string;
  }>;

  return (
    <section className="py-24 bg-[#000000]" id="how-it-works">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-white mb-16">
            {t("howItWorks.title")}
          </h2>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-8 relative">
          {/* connector line */}
          <div className="hidden sm:block absolute top-8 left-[calc(16.67%-1px)] right-[calc(16.67%-1px)] h-px bg-[#7D39EB]/30" />
          {steps.map((step, i) => (
            <Reveal key={i} delay={i * 0.15} className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-[#7D39EB]/10 border border-[#7D39EB]/30 flex items-center justify-center">
                    <span className="text-[#C6FF33] font-extrabold text-xl">{step.num}</span>
                  </div>
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{step.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
