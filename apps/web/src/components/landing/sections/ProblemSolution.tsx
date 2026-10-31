import { Check, X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

function CompareList({ title, items, positive }: { title: string; items: string[]; positive: boolean }) {
  const Icon = positive ? Check : X;

  return (
    <Card className={cn("h-full p-7", positive && "border-primary/30 ring-1 ring-primary/10")}>
      <h3 className={cn("text-lg font-semibold", positive ? "text-primary" : "text-muted-foreground")}>{title}</h3>
      <ul className="mt-5 space-y-4">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span
              className={cn(
                "mt-1 flex size-5 shrink-0 items-center justify-center rounded-full",
                positive ? "bg-success-soft text-success-strong" : "bg-danger-soft text-danger-strong",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
            </span>
            <span className={positive ? "text-foreground" : "text-muted-foreground"}>{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export async function ProblemSolution() {
  const t = await getTranslations("problem");

  return (
    <Section id="problem" tone="muted">
      <SectionHeading eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <Reveal>
          <CompareList title={t("beforeTitle")} items={t.raw("before") as string[]} positive={false} />
        </Reveal>
        <Reveal delay={0.1}>
          <CompareList title={t("afterTitle")} items={t.raw("after") as string[]} positive />
        </Reveal>
      </div>
    </Section>
  );
}
