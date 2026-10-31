import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { getIcon } from "@/lib/icons";
import type { Integration } from "../types";

// Social proof here is placeholder content (`trust.placeholder` in messages) until real sellers are on board.
export async function TrustStrip() {
  const t = await getTranslations("trust");
  const avatars = t.raw("avatars") as string[];
  const integrations = t.raw("integrations") as Integration[];

  return (
    <section className="border-y bg-surface">
      <Container className="flex flex-col items-center justify-between gap-6 py-8 lg:flex-row">
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2" aria-hidden>
            {avatars.map((letter, i) => (
              <span
                key={i}
                className="flex size-9 items-center justify-center rounded-full border-2 border-surface bg-primary-soft text-sm font-semibold text-primary"
              >
                {letter}
              </span>
            ))}
          </div>
          <p className="font-medium text-foreground">{t("label")}</p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
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
        </div>
      </Container>
    </section>
  );
}
