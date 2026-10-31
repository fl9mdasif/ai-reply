import { ArrowRight, Check, Sparkles } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { dashboardLink } from "@/lib/site";
import { MessengerChatMockup } from "../mockups/MessengerChatMockup";
import { OrderToast } from "../mockups/OrderToast";

export async function Hero() {
  const t = await getTranslations("hero");
  const locale = await getLocale();
  const microcopy = t.raw("microcopy") as string[];

  return (
    <section className="relative overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_75%_-10%,var(--primary-soft),transparent)]"
      />
      <Container className="relative grid items-center gap-14 pb-20 pt-10 sm:pt-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:pb-28">
        <Reveal>
          <Badge size="md">
            <Sparkles className="size-4" aria-hidden />
            {t("badge")}
          </Badge>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.4rem]">
            {t("headline")} <span className="text-primary">{t("headlineAccent")}</span>
          </h1>
          <p className="mt-6 max-w-prose text-lg text-muted-foreground">{t("subheadline")}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={dashboardLink(locale, "auth/register")} size="lg">
              {t("ctaPrimary")}
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="#how-it-works" variant="secondary" size="lg">
              {t("ctaSecondary")}
            </ButtonLink>
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {microcopy.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="size-4 text-success" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.15} className="relative mx-auto w-full max-w-sm">
          <MessengerChatMockup />
          <OrderToast className="absolute -bottom-6 -left-4 hidden sm:flex lg:-left-16" />
        </Reveal>
      </Container>
    </section>
  );
}
