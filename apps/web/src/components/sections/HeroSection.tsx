"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { fadeUp } from "@/lib/motion";
import MessengerMockup from "@/components/MessengerMockup";

export default function HeroSection() {
  const t = useTranslations();
  const locale = useLocale();
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const stats = [
    {
      num: "10K+",
      label: locale === "bn" ? "মেসেজ হ্যান্ডেল" : "Messages handled",
    },
    {
      num: "98%",
      label: locale === "bn" ? "উত্তরের হার" : "Reply rate",
    },
    {
      num: "40%",
      label: locale === "bn" ? "কম ভুয়া অর্ডার" : "Less fake orders",
    },
  ];

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center pt-16"
      style={{ background: "#000000" }}
    >
      {/* bg grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#7D39EB 1px, transparent 1px), linear-gradient(90deg, #7D39EB 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* bg glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#7D39EB]/20 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative max-w-6xl mx-auto px-4 sm:px-6 w-full"
      >
        <div className="grid lg:grid-cols-2 gap-12 items-center py-20">
          {/* left */}
          <div>
            <motion.div {...fadeUp(0.1)}>
              <span className="inline-block bg-[#7D39EB]/20 border border-[#7D39EB]/40 text-[#C6FF33] text-xs font-semibold px-3 py-1 rounded-full mb-6">
                {t("hero.badge")}
              </span>
            </motion.div>

            <motion.h1
              {...fadeUp(0.2)}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight text-balance mb-6"
            >
              {t("hero.headline")}
            </motion.h1>

            <motion.p
              {...fadeUp(0.3)}
              className="text-white/60 text-lg leading-relaxed mb-8 max-w-lg"
            >
              {t("hero.subheadline")}
            </motion.p>

            <motion.div {...fadeUp(0.4)} className="flex flex-wrap gap-3">
              <a
                href="#cta"
                className="bg-[#C6FF33] text-black font-bold px-6 py-3 rounded-xl hover:bg-[#d4ff55] transition-all hover:scale-105 active:scale-95"
              >
                {t("hero.ctaPrimary")}
              </a>
              <a
                href="#how-it-works"
                className="border border-white/20 text-white font-semibold px-6 py-3 rounded-xl hover:border-white/40 transition-colors"
              >
                {t("hero.ctaSecondary")}
              </a>
            </motion.div>

            {/* trust stats */}
            <motion.div {...fadeUp(0.5)} className="flex gap-6 mt-10">
              {stats.map((stat) => (
                <div key={stat.num}>
                  <p className="text-[#C6FF33] text-2xl font-extrabold">{stat.num}</p>
                  <p className="text-white/50 text-xs">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* right — 3D mockup */}
          <motion.div {...fadeUp(0.35)} className="flex justify-center lg:justify-end">
            <MessengerMockup />
          </motion.div>
        </div>
      </motion.div>

      {/* scroll indicator */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30"
      >
        <ChevronDown size={24} />
      </motion.div>
    </section>
  );
}
