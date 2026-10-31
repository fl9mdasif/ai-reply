import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion/reveal";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Step } from "../types";

export async function HowItWorks() {
  const t = await getTranslations("howItWorks");
  const steps = t.raw("steps") as Step[];

  return (
    <Section id="how-it-works">
      <SectionHeading eyebrow={t("eyebrow")} title={t("title")} />
      <div className="relative mt-14">
        <span aria-hidden className="absolute left-[16.6%] right-[16.6%] top-6 hidden h-px bg-border md:block" />
        <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, i) => (
            <li key={step.title}>
              <Reveal delay={i * 0.1} className="flex flex-col items-center text-center">
                <span className="flex size-12 items-center justify-center rounded-full border-4 border-surface bg-primary text-lg font-bold text-primary-foreground shadow-card">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 max-w-xs text-muted-foreground">{step.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
