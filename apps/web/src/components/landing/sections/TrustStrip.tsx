import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Marquee } from "@/components/ui/marquee";
import { getIcon } from "@/lib/icons";
import type { Integration } from "../types";

// The shop names and the "500+" label are placeholders (`trust.placeholder` in
// messages). They are made-up names on purpose: listing real companies without
// their permission would imply an endorsement they never gave.
export async function TrustStrip() {
  const t = await getTranslations("trust");
  const brands = t.raw("brands") as string[];
  const integrations = t.raw("integrations") as Integration[];

  return (
    <section className="border-y bg-surface py-10">
      <Container>
        <p className="text-center text-sm font-medium text-muted-foreground">{t("label")}</p>
      </Container>
      <Marquee items={brands} className="mt-6" />
      <Container className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <span className="text-sm text-muted-foreground">{t("worksWith")}</span>
        <ul className="flex flex-wrap justify-center gap-2">
          {integrations.map((item) => {
            const Icon = getIcon(item.icon);
            return (
              <li
                key={item.name}
                className="flex items-center gap-2 rounded-full border bg-background px-3.5 py-1.5 text-sm font-medium text-foreground"
              >
                <Icon className="size-4 text-primary" aria-hidden />
                {item.name}
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
