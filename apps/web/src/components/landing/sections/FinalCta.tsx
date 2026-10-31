import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { dashboardLink } from "@/lib/site";

export async function FinalCta() {
  const t = await getTranslations("finalCta");
  const locale = await getLocale();

  return (
    <section className="bg-surface py-16 sm:py-20">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-primary-deep px-6 py-14 text-center sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_20rem_at_50%_-20%,var(--primary),transparent)] opacity-60"
          />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">{t("title")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">{t("subtitle")}</p>
            <ButtonLink href={dashboardLink(locale, "auth/register")} variant="inverse" size="lg" className="mt-8">
              {t("button")}
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
