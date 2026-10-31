import { CheckCircle2, Send } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "../types";

/** A Messenger thread seen from the customer's phone: customer on the right, the Page's AI on the left. */
export async function MessengerChatMockup({ className }: { className?: string }) {
  const t = await getTranslations("chatMockup");
  const messages = t.raw("messages") as ChatMessage[];

  return (
    <figure
      aria-label={t("ariaLabel")}
      className={cn("w-full max-w-sm overflow-hidden rounded-3xl border bg-surface shadow-float", className)}
    >
      <figcaption className="flex items-center gap-3 border-b px-4 py-3">
        <span className="relative flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-messenger-from to-messenger-to text-sm font-bold text-primary-foreground">
          {t("pageName").charAt(0)}
          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface bg-success" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">{t("pageName")}</span>
          <span className="block truncate text-xs text-muted-foreground">{t("status")}</span>
        </span>
      </figcaption>

      <div className="flex flex-col gap-2 px-4 py-4 text-[0.9rem] leading-relaxed">
        {messages.map((m, i) => (
          <p
            key={i}
            className={cn(
              "max-w-[82%] rounded-2xl px-3.5 py-2",
              m.from === "customer"
                ? "self-end rounded-br-md bg-gradient-to-br from-messenger-from to-messenger-to text-primary-foreground"
                : "self-start rounded-bl-md bg-messenger-bubble text-foreground",
            )}
          >
            {m.text}
          </p>
        ))}

        <div className="mt-1 self-start rounded-2xl rounded-bl-md border border-success/30 bg-success-soft px-3.5 py-2.5">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-success-strong">
            <CheckCircle2 className="size-4" aria-hidden />
            {t("confirmTitle")}
          </p>
          <p className="mt-0.5 text-[0.85rem] text-foreground">{t("confirmBody")}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t px-4 py-3">
        <span className="flex-1 truncate rounded-full bg-messenger-bubble px-4 py-2 text-sm text-muted-foreground">
          {t("inputPlaceholder")}
        </span>
        <Send className="size-5 text-messenger-from" aria-hidden />
      </div>
    </figure>
  );
}
