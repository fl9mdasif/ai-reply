"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslations } from "next-intl";
import Reveal from "@/components/ui/Reveal";

export default function HowItWorksSection() {
  const t = useTranslations();
  const steps = t.raw("howItWorks.steps") as Array<{
    num: string;
    title: string;
    body: string;
  }>;
  const lineRef = useRef<HTMLDivElement>(null);
  const inView = useInView(lineRef, { once: true, amount: 0.5 });

  return (
    <section className="py-24 bg-[#000000]" id="how-it-works">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-white mb-16">
            {t("howItWorks.title")}
          </h2>
        </Reveal>
        <div ref={lineRef} className="grid sm:grid-cols-3 gap-8 relative">
          {/* track line */}
          <div className="hidden sm:block absolute top-8 left-[calc(16.67%)] right-[calc(16.67%)] h-px bg-white/10">
            <motion.div
              className="h-full bg-gradient-to-r from-[#7D39EB] to-[#C6FF33]"
              initial={{ width: "0%" }}
              animate={inView ? { width: "100%" } : {}}
              transition={{ duration: 1.4, delay: 0.2, ease: "easeInOut" }}
            />
          </div>

          {steps.map((step, i) => (
            <Reveal key={i} delay={i * 0.18} className="relative">
              <div className="flex flex-col items-center text-center">
                <motion.div
                  className="relative mb-6"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={inView ? { scale: 1, opacity: 1 } : {}}
                  transition={{ duration: 0.4, delay: 0.15 + i * 0.2 }}
                >
                  <div className="w-16 h-16 rounded-2xl bg-[#7D39EB]/15 border border-[#7D39EB]/40 flex items-center justify-center">
                    <span className="text-[#C6FF33] font-extrabold text-xl">{step.num}</span>
                  </div>
                </motion.div>
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
