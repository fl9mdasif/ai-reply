"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Check } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Reveal from "@/components/ui/Reveal";

export default function CTASection() {
  const t = useTranslations();
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="py-24 bg-[#000000]" id="cta">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <Reveal>
          <div className="inline-flex w-16 h-16 rounded-2xl bg-[#C6FF33]/10 border border-[#C6FF33]/20 mb-6 items-center justify-center mx-auto">
            <Bot size={28} className="text-[#C6FF33]" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            {t("cta.title")}
          </h2>
          <p className="text-white/50 mb-8">{t("cta.subtitle")}</p>
        </Reveal>

        <Reveal delay={0.1}>
          {submitted ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#C6FF33]/10 border border-[#C6FF33]/30 rounded-2xl py-6 px-8"
            >
              <Check size={32} className="text-[#C6FF33] mx-auto mb-2" />
              <p className="text-white font-semibold">
                {locale === "bn"
                  ? "পাঠানো হয়েছে! শীঘ্রই যোগাযোগ করব।"
                  : "Got it! We'll be in touch soon."}
              </p>
            </motion.div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email) setSubmitted(true);
              }}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("cta.emailPlaceholder")}
                className="flex-1 bg-white/5 border border-white/20 text-white placeholder:text-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#7D39EB] transition-colors"
              />
              <button
                type="submit"
                className="bg-[#C6FF33] text-black font-bold px-6 py-3 rounded-xl hover:bg-[#d4ff55] transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                {t("cta.button")}
              </button>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
