import { getTranslations } from "next-intl/server";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { Tabs } from "@/components/ui/tabs";
import { DashboardMockup } from "../mockups/DashboardMockup";
import { MessengerChatMockup } from "../mockups/MessengerChatMockup";
import { OrderCardMockup } from "../mockups/OrderCardMockup";
import type { Step } from "../types";

export async function ProductTour() {
  const t = await getTranslations("tour");

  return (
    <Section id="tour">
      <SectionHeading eyebrow={t("eyebrow")} title={t("title")} />
      <div className="mt-12 rounded-3xl bg-background p-4 sm:p-8">
        <Tabs
          label={t("label")}
          tabs={t.raw("tabs") as Step[]}
          panels={[
            <MessengerChatMockup key="chat" className="mx-auto" />,
            <OrderCardMockup key="order" />,
            <DashboardMockup key="dashboard" />,
          ]}
        />
      </div>
    </Section>
  );
}
