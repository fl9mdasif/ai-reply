"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslations } from "next-intl";

export default function MetricsSection() {
  const t = useTranslations();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const metrics = t.raw("metrics.items") as Array<{ value: string; label: string }>;

  return (
    <section ref={ref} className="py-20 bg-[#000000]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center text-[#71717A] text-xs font-semibold uppercase tracking-widest mb-12"
        >
          {t("metrics.title")}
        </motion.p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-0 lg:divide-x lg:divide-white/10">
          {metrics.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
              className="text-center"
            >
              <p className="text-4xl lg:text-5xl font-extrabold text-[#C6FF33] mb-2 tabular-nums">
                {m.value}
              </p>
              <p className="text-white/50 text-sm">{m.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
