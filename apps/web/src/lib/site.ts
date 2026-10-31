// Shared site constants: anchors used by Navbar + Footer and external app URLs.

const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001";

export const siteConfig = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002",
  dashboardUrl,
};

/** Section anchors; `key` is the translation key under `nav`. */
export const navLinks = [
  { key: "features", href: "#features" },
  { key: "howItWorks", href: "#how-it-works" },
  { key: "pricing", href: "#pricing" },
  { key: "faq", href: "#faq" },
] as const;

export function dashboardLink(locale: string, path: "auth/login" | "auth/register") {
  return `${dashboardUrl}/${locale}/${path}`;
}
