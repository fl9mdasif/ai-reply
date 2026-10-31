"use client";

import { useTranslations } from "next-intl";

const shops = [
  "Rina Fashion", "Khan Boutique", "Dhaka Style", "Priyanka Store",
  "Sagor Crafts", "Mitu Collection", "BD Threads", "Green Valley",
  "Sunita Sarees", "Raju Electronics", "Nur Cosmetics", "Tania's Closet",
];

export default function LogoMarqueeSection() {
  const t = useTranslations();
  const doubled = [...shops, ...shops];

  return (
    <section className="py-10 bg-white border-y border-[#EDE9FE] overflow-hidden">
      <p className="text-center text-xs font-semibold text-[#71717A] uppercase tracking-widest mb-6 px-4">
        {t("logoMarquee.trusted")}
      </p>
      <div
        className="flex items-center"
        style={{ animation: "marquee 30s linear infinite" }}
      >
        {doubled.map((name, i) => (
          <span
            key={i}
            className="shrink-0 mx-4 text-sm font-semibold text-[#09090B]/35 whitespace-nowrap px-4 py-1.5 rounded-full border border-[#EDE9FE] bg-[#F8F7FF]"
          >
            {name}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee { animation-play-state: paused; }
        }
      `}</style>
    </section>
  );
}
