import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import type { IconItem } from "../types";

export async function Roadmap() {
  const t = await getTranslations("roadmap");
  const items = t.raw("items") as IconItem[];

  return (
    <Section id="roadmap">
      <SectionHeading eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => (
          <li key={item.title}>
            <Reveal delay={(i % 4) * 0.06} className="h-full">
              <Card className="flex h-full flex-col gap-4 border-dashed bg-background shadow-none">
                <div className="flex items-start justify-between gap-3">
                  <IconTile icon={item.icon} tone="neutral" />
                  <Badge tone="primary">{t("badge")}</Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1.5 text-[0.95rem] text-muted-foreground">{item.body}</p>
                </div>
              </Card>
            </Reveal>
          </li>
        ))}
      </ul>
    </Section>
  );
}
