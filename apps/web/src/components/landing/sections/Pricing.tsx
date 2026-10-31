import { Gift } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { dashboardLink } from "@/lib/site";
import type { Addon, Plan } from "../types";
import { PricingPlans } from "./PricingPlans";

export async function Pricing() {
  const t = await getTranslations("pricing");
  const locale = await getLocale();
  const methods = t.raw("paymentMethods") as string[];
  const addons = t.raw("addons") as Addon[];

  return (
    <Section id="pricing" tone="muted">
      <SectionHeading eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />

      <PricingPlans
        plans={t.raw("plans") as Plan[]}
        ctaHref={dashboardLink(locale, "auth/register")}
        labels={{
          billingLabel: t("billingLabel"),
          monthly: t("monthly"),
          annual: t("annual"),
          annualSave: t("annualSave"),
          perMonth: t("perMonth"),
          billedAnnually: t("billedAnnually"),
          popular: t("popular"),
        }}
      />

      <div className="mx-auto mt-14 max-w-4xl">
        <h3 className="text-center text-xl font-semibold text-foreground">{t("addonsTitle")}</h3>
        <p className="mt-1 text-center text-muted-foreground">{t("addonsSubtitle")}</p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {addons.map((addon) => (
            <li key={addon.name} className="flex items-center justify-between gap-4 rounded-2xl border bg-surface px-5 py-4">
              <span className="font-medium text-foreground">{addon.name}</span>
              <span className="shrink-0 text-right">
                <span className="font-semibold text-foreground">{addon.price}</span>{" "}
                <span className="text-sm text-muted-foreground">{addon.unit}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-center text-xs text-muted-foreground">{t("addonsNote")}</p>
      </div>

      <div className="mt-10 flex flex-col items-center justify-center gap-4 text-sm text-muted-foreground sm:flex-row sm:gap-8">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <Gift className="size-4 text-primary" aria-hidden />
          {t("trialNote")}
        </p>
        <p className="flex flex-wrap items-center justify-center gap-2">
          {t("payWith")}:
          {methods.map((m) => (
            <span key={m} className="rounded-md border bg-surface px-2.5 py-1 font-medium text-foreground">
              {m}
            </span>
          ))}
        </p>
      </div>
    </Section>
  );
}
