"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

const NAV_ANCHORS = ["#features", "#pricing", "#how-it-works", "#contact"];

export default function SiteFooter() {
  const t = useTranslations();
  const locale = useLocale();
  const otherLocale = locale === "en" ? "bn" : "en";

  return (
    <footer className="bg-[#09090B] border-t border-white/5 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row justify-between gap-8">
          {/* brand */}
          <div>
            <Link
              href={`/${locale}`}
              className="text-white font-bold text-xl tracking-tight block mb-2"
            >
              <span className="text-[#C6FF33]">j</span>obabai
            </Link>
            <p className="text-white/40 text-sm max-w-xs">{t("footer.tagline")}</p>
          </div>

          {/* links */}
          <div className="flex gap-12">
            <div>
              <p className="text-white/20 text-xs font-semibold uppercase tracking-widest mb-3">
                Product
              </p>
              <ul className="space-y-2">
                {(t.raw("footer.links") as string[]).map((link, i) => (
                  <li key={i}>
                    <a
                      href={NAV_ANCHORS[i] ?? "#"}
                      className="text-white/50 hover:text-white text-sm transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-white/20 text-xs font-semibold uppercase tracking-widest mb-3">
                Legal
              </p>
              <ul className="space-y-2">
                {(t.raw("footer.legal") as string[]).map((link, i) => (
                  <li key={i}>
                    <a href="#" className="text-white/50 hover:text-white text-sm transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-white/30 text-xs">{t("footer.copyright")}</p>
          <Link
            href={`/${otherLocale}`}
            className="text-white/40 hover:text-white text-xs transition-colors"
          >
            {t("footer.langToggle")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
