import { ArrowLeft, SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { navLinks } from "@/lib/site";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  const nav = await getTranslations("nav");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex flex-1 items-center py-20">
        <Container className="flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <SearchX className="size-8" aria-hidden />
          </span>
          <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-primary">404</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t("title")}</h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">{t("body")}</p>

          <Link href="/" className={buttonVariants({ size: "lg", className: "mt-8" })}>
            <ArrowLeft className="size-4" aria-hidden />
            {t("home")}
          </Link>

          <div className="mt-12 w-full max-w-md border-t pt-8">
            <p className="text-sm text-muted-foreground">{t("links")}</p>
            <ul className="mt-4 flex flex-wrap justify-center gap-2">
              {navLinks.map((link) => (
                <li key={link.key}>
                  <Link
                    href={`/${link.href}`}
                    className="inline-flex h-10 items-center rounded-full border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary-soft"
                  >
                    {nav(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
