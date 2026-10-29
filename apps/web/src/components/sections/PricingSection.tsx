"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import TiltCard from "@/components/ui/TiltCard";
import Reveal from "@/components/ui/Reveal";

const PAYMENT_METHODS = ["bKash", "Nagad", "Card"];

export default function PricingSection() {
  const t = useTranslations();
  const [annual, setAnnual] = useState(false);

  const plans = t.raw("pricing.plans") as Array<{
    name: string;
    price: string;
    period: string;
    orders: string;
    popular?: boolean;
    features: string[];
    cta: string;
  }>;

  return (
    <section className="py-24 bg-[#000000]" id="pricing">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-white mb-3">
            {t("pricing.title")}
          </h2>
          <p className="text-center text-white/50 mb-8">{t("pricing.subtitle")}</p>
        </Reveal>

        {/* billing toggle */}
        <Reveal>
          <div className="flex items-center justify-center gap-3 mb-10">
            <span className={`text-sm ${!annual ? "text-white" : "text-white/40"}`}>
              {t("pricing.monthly")}
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                annual ? "bg-[#7D39EB]" : "bg-white/20"
              }`}
              aria-label="Toggle annual pricing"
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                  annual ? "left-7" : "left-1"
                }`}
              />
            </button>
            <span className={`text-sm ${annual ? "text-white" : "text-white/40"}`}>
              {t("pricing.annual")}
            </span>
            {annual && (
              <span className="bg-[#C6FF33] text-black text-xs font-bold px-2 py-0.5 rounded-full">
                {t("pricing.annualSave")}
              </span>
            )}
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-3 gap-5 items-start">
          {plans.map((plan, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <TiltCard
                className={`rounded-2xl p-6 relative ${
                  plan.popular
                    ? "bg-[#7D39EB] border-2 border-[#9B6EF3]"
                    : "bg-[#111113] border border-white/10"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#C6FF33] text-black text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-white font-bold text-lg mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-white text-4xl font-extrabold">{plan.price}</span>
                  <span className="text-white/50 text-sm">{plan.period}</span>
                </div>
                <p className="text-white/50 text-xs mb-5">{plan.orders}</p>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex gap-2 items-start text-sm text-white/80">
                      <Check
                        size={14}
                        className={`mt-0.5 flex-none ${plan.popular ? "text-[#C6FF33]" : "text-[#7D39EB]"}`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="#cta"
                  className={`block text-center font-semibold py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 ${
                    plan.popular
                      ? "bg-[#C6FF33] text-black"
                      : "bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  {plan.cta}
                </a>
              </TiltCard>
            </Reveal>
          ))}
        </div>

        {/* payment methods */}
        <Reveal>
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className="text-white/30 text-sm">Pay with</span>
            {PAYMENT_METHODS.map((m) => (
              <span
                key={m}
                className="bg-white/5 border border-white/10 text-white/60 text-xs px-3 py-1 rounded-full"
              >
                {m}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
