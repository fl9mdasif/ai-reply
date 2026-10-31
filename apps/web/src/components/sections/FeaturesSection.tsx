"use client";

import { Bot } from "lucide-react";
import { useTranslations } from "next-intl";
import Reveal from "@/components/ui/Reveal";
import { ICONS } from "@/lib/icons";

const bentoClasses = [
  "sm:col-span-2 lg:col-span-2",
  "",
  "",
  "",
  "",
  "sm:col-span-2 lg:col-span-3",
];

export default function FeaturesSection() {
  const t = useTranslations();
  const featureCards = t.raw("features.cards") as Array<{
    icon: string;
    title: string;
    body: string;
  }>;

  return (
    <section className="py-24 bg-white" id="features">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-[#09090B] mb-12">
            {t("features.title")}
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {featureCards.map((card, i) => {
            const Icon = ICONS[card.icon] ?? Bot;
            const isHero = i === 0;
            const isWide = i === 5;
            return (
              <Reveal
                key={i}
                delay={(i % 3) * 0.08}
                className={bentoClasses[i]}
              >
                <div
                  className={`group bg-[#F8F7FF] border border-[#EDE9FE] rounded-2xl p-6 hover:border-[#7D39EB]/50 hover:bg-white hover:shadow-lg hover:shadow-[#7D39EB]/6 transition-all h-full flex ${isWide ? "flex-row items-center gap-6" : "flex-col"}`}
                >
                  <div
                    className={`rounded-xl bg-white border border-[#EDE9FE] group-hover:bg-[#7D39EB] group-hover:border-[#7D39EB] flex items-center justify-center transition-colors shrink-0 ${isHero ? "w-12 h-12 mb-5" : "w-10 h-10 mb-4"}`}
                  >
                    <Icon
                      size={isHero ? 22 : 18}
                      className="text-[#7D39EB] group-hover:text-white transition-colors"
                    />
                  </div>
                  <div className={isWide ? "flex-1" : ""}>
                    <h3
                      className={`font-bold text-[#09090B] mb-2 ${isHero ? "text-lg" : "text-base"}`}
                    >
                      {card.title}
                    </h3>
                    <p className="text-[#71717A] text-sm leading-relaxed">{card.body}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
