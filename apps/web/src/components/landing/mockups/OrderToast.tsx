import { PackageCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export async function OrderToast({ className }: { className?: string }) {
  const t = await getTranslations("orderToast");

  return (
    <div aria-hidden className={cn("flex items-center gap-3 rounded-2xl border bg-surface px-4 py-3 shadow-float", className)}>
      <span className="flex size-10 items-center justify-center rounded-xl bg-success-soft text-success-strong">
        <PackageCheck className="size-5" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-foreground">{t("title")}</span>
        <span className="block text-xs text-muted-foreground">{t("body")}</span>
      </span>
      <Badge tone="success">{t("risk")}</Badge>
    </div>
  );
}
