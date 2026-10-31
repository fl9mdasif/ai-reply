import { Quote } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import type { ResultItem } from "../types";

// Testimonials are placeholders (`placeholder: true` in messages) until real sellers share results.
export async function Results() {
  const t = await getTranslations("results");
  const items = t.raw("items") as ResultItem[];

  return (
    <Section id="results" tone="muted">
      <SectionHeading eyebrow={t("eyebrow")} title={t("title")} />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {items.map((item, i) => (
          <Reveal key={item.name} delay={i * 0.08}>
            <Card className="flex h-full flex-col">
              <p className="text-sm text-muted-foreground">{item.period}</p>
              <p className="mt-1 text-4xl font-bold text-primary">{item.metric}</p>
              <p className="font-medium text-foreground">{item.metricLabel}</p>
              <blockquote className="mt-5 flex-1 border-t pt-5 text-foreground">
                <Quote className="mb-2 size-5 text-primary/40" aria-hidden />
                {item.quote}
              </blockquote>
              <div className="mt-5 flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">
                  {item.name.charAt(0)}
                </span>
                <span>
                  <span className="block font-semibold text-foreground">{item.name}</span>
                  <span className="block text-sm text-muted-foreground">{item.shop}</span>
                </span>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
