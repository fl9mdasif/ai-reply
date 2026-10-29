"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import Reveal from "@/components/ui/Reveal";

export default function FAQSection() {
  const t = useTranslations();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqItems = t.raw("faq.items") as Array<{ q: string; a: string }>;

  return (
    <section className="py-24 bg-[#F8F7FF]" id="contact">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-[#09090B] mb-10">
            {t("faq.title")}
          </h2>
        </Reveal>
        <div className="space-y-3">
          {faqItems.map((item, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <div className="bg-white border border-[#EDE9FE] rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#F3EEFF]/50 transition-colors"
                  aria-expanded={openIndex === i}
                >
                  <span className="font-semibold text-[#09090B] text-sm pr-4">{item.q}</span>
                  <ChevronDown
                    size={16}
                    className={`flex-none text-[#7D39EB] transition-transform ${
                      openIndex === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-4 text-[#71717A] text-sm leading-relaxed">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
