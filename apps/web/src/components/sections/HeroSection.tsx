"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { fadeUp } from "@/lib/motion";
import DashboardMockup from "@/components/DashboardMockup";

export default function HeroSection() {
  const t = useTranslations();
  const locale = useLocale();
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center pt-16 overflow-hidden"
      style={{ background: "#F8F7FF" }}
    >
      {/* subtle violet radial glow top-right */}
      <div
        className="absolute -top-32 -right-32 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(125,57,235,0.12) 0%, transparent 65%)",
        }}
      />
      {/* subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#7D39EB 1px, transparent 1px), linear-gradient(90deg, #7D39EB 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <motion.div
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative max-w-6xl mx-auto px-4 sm:px-6 w-full"
      >
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center py-20">
          {/* left — copy */}
          <div>
            <motion.div {...fadeUp(0.1)}>
              <span className="inline-block bg-[#7D39EB]/10 border border-[#7D39EB]/25 text-[#7D39EB] text-xs font-semibold px-3 py-1 rounded-full mb-6">
                {t("hero.badge")}
              </span>
            </motion.div>

            <motion.h1
              {...fadeUp(0.2)}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#09090B] leading-tight text-balance mb-6"
            >
              {t("hero.headline")}
            </motion.h1>

            <motion.p
              {...fadeUp(0.3)}
              className="text-[#52525B] text-lg leading-relaxed mb-8 max-w-lg"
            >
              {t("hero.subheadline")}
            </motion.p>

            <motion.div {...fadeUp(0.4)} className="flex flex-wrap gap-3 mb-5">
              <a
                href="#cta"
                className="bg-[#7D39EB] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#6B2ED6] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#7D39EB]/25"
              >
                {t("hero.ctaPrimary")}
              </a>
              <a
                href="#how-it-works"
                className="border border-[#E4E4E7] text-[#09090B] font-semibold px-6 py-3 rounded-xl hover:border-[#7D39EB]/40 hover:text-[#7D39EB] transition-colors"
              >
                {t("hero.ctaSecondary")}
              </a>
            </motion.div>

            <motion.p {...fadeUp(0.45)} className="text-xs text-[#71717A]">
              {locale === "bn"
                ? "ক্রেডিট কার্ড লাগবে না · যেকোনো সময় বাতিল করুন"
                : "No credit card required · Cancel any time"}
            </motion.p>
          </div>

          {/* right — dashboard mockup */}
          <motion.div
            {...fadeUp(0.35)}
            className="flex justify-center lg:justify-end"
          >
            <DashboardMockup />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
