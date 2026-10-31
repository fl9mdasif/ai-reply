import { getTranslations } from "next-intl/server";
import { Accordion } from "@/components/ui/accordion";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import type { FaqItem } from "../types";

export async function Faq() {
  const t = await getTranslations("faq");

  return (
    <Section id="faq" containerClassName="max-w-3xl">
      <SectionHeading eyebrow={t("eyebrow")} title={t("title")} />
      <div className="mt-12">
        <Accordion items={t.raw("items") as FaqItem[]} />
      </div>
    </Section>
  );
}
