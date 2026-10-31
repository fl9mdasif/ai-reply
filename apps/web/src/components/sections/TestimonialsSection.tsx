"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import Reveal from "@/components/ui/Reveal";

export default function TestimonialsSection() {
  const t = useTranslations();
  const items = t.raw("testimonials.items") as Array<{
    quote: string;
    name: string;
    shop: string;
  }>;

  return (
    <section className="py-24 bg-[#F8F7FF]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-[#09090B] mb-12">
            {t("testimonials.title")}
          </h2>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className="bg-white border-l-4 border-[#7D39EB] rounded-2xl p-6 shadow-sm hover:shadow-md hover:shadow-[#7D39EB]/8 transition-shadow h-full flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={14} className="fill-[#F59E0B] text-[#F59E0B]" />
                  ))}
                </div>
                <p className="text-[#52525B] text-sm leading-relaxed flex-1 mb-5">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <div>
                  <p className="text-sm font-bold text-[#09090B]">{item.name}</p>
                  <p className="text-xs text-[#71717A]">{item.shop}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
