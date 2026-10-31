import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";
import type { IconItem } from "../types";

// Bento layout: the first card is wide, the last card spans the full row.
const spans = ["md:col-span-2", "", "", "", "", "md:col-span-3"];

export async function Features() {
  const t = await getTranslations("features");
  const cards = t.raw("cards") as IconItem[];

  return (
    <Section id="features" tone="muted">
      <SectionHeading eyebrow={t("eyebrow")} title={t("title")} />
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {cards.map((card, i) => (
          <Reveal key={card.title} delay={(i % 3) * 0.08} className={spans[i]}>
            <Card
              className={cn(
                "flex h-full flex-col gap-4 transition-colors duration-200 hover:border-primary/40",
                i === 0 && "bg-primary-soft/60",
              )}
            >
              <IconTile icon={card.icon} />
              <div>
                <h3 className="text-lg font-semibold text-foreground">{card.title}</h3>
                <p className="mt-2 text-muted-foreground">{card.body}</p>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
