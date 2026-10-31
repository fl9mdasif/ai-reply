import { defineRouting } from "next-intl/routing";

// Bangla first: every visitor lands on /bn unless they pick English.
export const routing = defineRouting({
  locales: ["bn", "en"],
  defaultLocale: "bn",
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
