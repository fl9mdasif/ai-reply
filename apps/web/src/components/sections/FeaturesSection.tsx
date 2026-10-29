"use client";

import { Bot } from "lucide-react";
import { useTranslations } from "next-intl";
import TiltCard from "@/components/ui/TiltCard";
import Reveal from "@/components/ui/Reveal";
import { ICONS } from "@/lib/icons";

export default function FeaturesSection() {
  const t = useTranslations();
  const featureCards = t.raw("features.cards") as Array<{
    icon: string;
    title: string;
    body: string;
  }>;

  return (
    <section className="py-24 bg-[#F8F7FF]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-[#09090B] mb-12">
            {t("features.title")}
          </h2>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featureCards.map((card, i) => {
            const Icon = ICONS[card.icon] ?? Bot;
            return (
              <Reveal key={i} delay={(i % 3) * 0.1}>
                <TiltCard className="group bg-white border border-[#EDE9FE] rounded-2xl p-6 hover:border-[#7D39EB]/40 hover:shadow-lg hover:shadow-[#7D39EB]/5 transition-all h-full">
                  <div className="w-10 h-10 rounded-xl bg-[#F3EEFF] group-hover:bg-[#7D39EB] flex items-center justify-center mb-4 transition-colors">
                    <Icon
                      size={20}
                      className="text-[#7D39EB] group-hover:text-white transition-colors"
                    />
                  </div>
                  <h3 className="font-bold text-[#09090B] mb-2">{card.title}</h3>
                  <p className="text-[#71717A] text-sm leading-relaxed">{card.body}</p>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
