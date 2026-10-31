"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { dashboardLink, navLinks } from "@/lib/site";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { Logo } from "./Logo";

export function Navbar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = () => setOpen(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-200",
        scrolled || open ? "border-border bg-surface/90 backdrop-blur-md" : "border-transparent bg-transparent",
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-4">
        <a href="#top" aria-label={t("home")} onClick={close}>
          <Logo />
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className="rounded-lg px-3 py-2 text-[0.95rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(link.key)}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LocaleSwitcher />
          <ButtonLink href={dashboardLink(locale, "auth/login")} variant="ghost" size="sm">
            {t("login")}
          </ButtonLink>
          <ButtonLink href={dashboardLink(locale, "auth/register")} size="sm">
            {t("cta")}
          </ButtonLink>
        </div>

        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-lg text-foreground md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? t("menuClose") : t("menuOpen")}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
        </button>
      </Container>

      <div id="mobile-menu" hidden={!open} className="border-t bg-surface md:hidden">
        <Container className="flex flex-col gap-1 py-4">
          {navLinks.map((link) => (
            <a
              key={link.key}
              href={link.href}
              onClick={close}
              className="rounded-lg px-3 py-3 font-medium text-foreground hover:bg-primary-soft"
            >
              {t(link.key)}
            </a>
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t pt-4">
            <ButtonLink href={dashboardLink(locale, "auth/register")} size="lg">
              {t("cta")}
            </ButtonLink>
            <ButtonLink href={dashboardLink(locale, "auth/login")} variant="secondary" size="lg">
              {t("login")}
            </ButtonLink>
            <LocaleSwitcher className="justify-center" />
          </div>
        </Container>
      </div>
    </header>
  );
}
