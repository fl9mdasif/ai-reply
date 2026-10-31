import { getLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { dashboardLink, navLinks } from "@/lib/site";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { Logo } from "./Logo";

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href} className="text-[0.95rem] text-muted-foreground transition-colors hover:text-foreground">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function Footer() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");
  const locale = await getLocale();

  return (
    <footer className="border-t bg-surface">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-[0.95rem] text-muted-foreground">{t("tagline")}</p>
          <p className="mt-4 text-sm text-muted-foreground">{t("madeBy")}</p>
        </div>
        <FooterColumn
          title={t("product")}
          links={navLinks.map((link) => ({ label: nav(link.key), href: link.href }))}
        />
        <FooterColumn
          title={t("account")}
          links={[
            { label: t("login"), href: dashboardLink(locale, "auth/login") },
            { label: t("register"), href: dashboardLink(locale, "auth/register") },
          ]}
        />
      </Container>
      <div className="border-t">
        <Container className="flex flex-col items-center justify-between gap-3 py-5 sm:flex-row">
          <p className="text-sm text-muted-foreground">{t("copyright")}</p>
          <LocaleSwitcher />
        </Container>
      </div>
    </footer>
  );
}
