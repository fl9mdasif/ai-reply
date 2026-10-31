import { MessageCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import type { LabelValue } from "../types";

/** The order the AI assembled from the chat, with its risk check. */
export async function OrderCardMockup() {
  const t = await getTranslations("orderMockup");
  const fields = t.raw("fields") as LabelValue[];

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border bg-surface p-6 shadow-float">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-foreground">{t("title")}</h3>
        <Badge tone="neutral">
          <MessageCircle className="size-3.5" aria-hidden />
          {t("source")}
        </Badge>
      </div>

      <dl className="mt-5 divide-y rounded-2xl border">
        {fields.map((f) => (
          <div key={f.label} className="flex justify-between gap-4 px-4 py-3 text-[0.95rem]">
            <dt className="text-muted-foreground">{f.label}</dt>
            <dd className="text-right font-medium text-foreground">{f.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 rounded-2xl bg-success-soft p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground">{t("riskLabel")}</span>
          <span className="text-sm font-semibold text-success-strong">{t("riskValue")}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface" aria-hidden>
          <div className="h-full w-[12%] rounded-full bg-success" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t("riskHint")}</p>
      </div>
    </div>
  );
}
