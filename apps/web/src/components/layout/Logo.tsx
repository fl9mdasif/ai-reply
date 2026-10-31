import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-xl font-bold tracking-tight", className)}>
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-lg",
          inverted ? "bg-surface text-primary-deep" : "bg-primary text-primary-foreground",
        )}
      >
        <MessageCircle className="size-[1.1rem]" aria-hidden />
      </span>
      <span className={inverted ? "text-primary-foreground" : "text-foreground"}>jobabai</span>
    </span>
  );
}
