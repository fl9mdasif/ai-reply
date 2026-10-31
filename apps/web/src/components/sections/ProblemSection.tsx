"use client";

import { X, Check } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Reveal from "@/components/ui/Reveal";

const beforeBn = [
  "রাতে মেসেজ জমা পড়ে, সকালে সব রিপ্লাই দিতে হয়",
  "ভুয়া COD অর্ডার চেক করার কোনো সিস্টেম নেই",
  "অর্ডার হারিয়ে যায়, কোনো রেকর্ড থাকে না",
  "বিক্রেতাকে সার্বক্ষণিক অনলাইনে থাকতে হয়",
];
const afterBn = [
  "AI ২৪/৭ রিপ্লাই দেয়, ঘুম থেকে উঠে দেখেন অর্ডার",
  "রিস্ক স্কোর দিয়ে ভুয়া অর্ডার স্বয়ংক্রিয়ভাবে ফ্ল্যাগ হয়",
  "সব অর্ডার Google Sheet-এ অটো সেভ হয়",
  "Bot চালু থাকে, আপনি বাকি ব্যবসার কাজ করেন",
];

const beforeEn = [
  "Messages pile up overnight — you reply all morning",
  "No system to detect fake COD orders",
  "Orders fall through the cracks, no record",
  "Seller must stay online 24/7",
];
const afterEn = [
  "AI replies 24/7 — wake up to confirmed orders",
  "Risk score flags suspicious orders automatically",
  "Every order auto-saved to your Google Sheet",
  "Bot runs while you focus on the rest of your business",
];

export default function ProblemSection() {
  const t = useTranslations();
  const locale = useLocale();
  const before = locale === "bn" ? beforeBn : beforeEn;
  const after = locale === "bn" ? afterBn : afterEn;

  return (
    <section className="py-24 bg-[#F8F7FF]" id="problem">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-[#09090B] mb-3">
            {t("problem.title")}
          </h2>
          <p className="text-center text-[#71717A] mb-12 max-w-xl mx-auto text-sm">
            {locale === "bn"
              ? "প্রতিটি ম্যানুয়াল কাজ jobabai স্বয়ংক্রিয়ভাবে করে দেয়।"
              : "Every manual task — jobabai handles it automatically."}
          </p>
        </Reveal>
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Before column */}
          <Reveal delay={0.1}>
            <div className="bg-white border border-red-100 rounded-2xl p-6 h-full">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                  <X size={12} className="text-red-500" />
                </div>
                <span className="text-sm font-bold text-red-600">
                  {locale === "bn" ? "ম্যানুয়াল পদ্ধতি" : "Manual process"}
                </span>
              </div>
              <ul className="space-y-3">
                {before.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <X size={14} className="text-red-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-[#52525B] leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* After column */}
          <Reveal delay={0.2}>
            <div className="bg-white border border-[#7D39EB]/25 rounded-2xl p-6 h-full shadow-sm shadow-[#7D39EB]/5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 rounded-full bg-[#7D39EB]/10 flex items-center justify-center">
                  <Check size={12} className="text-[#7D39EB]" />
                </div>
                <span className="text-sm font-bold text-[#7D39EB]">
                  {locale === "bn" ? "jobabai দিয়ে" : "With jobabai"}
                </span>
              </div>
              <ul className="space-y-3">
                {after.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check size={14} className="text-[#7D39EB] mt-0.5 shrink-0" />
                    <span className="text-sm text-[#09090B] leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
