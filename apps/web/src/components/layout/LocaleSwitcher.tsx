"use client";

import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/** Toggles between the two locales and keeps the current path and #section. */
export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("locale");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const target = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;

  return (
    <Link
      href={pathname}
      locale={target}
      hrefLang={target}
      aria-label={t("switchTo")}
      onClick={(e) => {
        e.preventDefault();
        router.replace(`${pathname}${window.location.hash}`, { locale: target, scroll: false });
      }}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary-soft hover:text-foreground",
        className,
      )}
    >
      <Globe className="size-4" aria-hidden />
      {t("short")}
    </Link>
  );
}
