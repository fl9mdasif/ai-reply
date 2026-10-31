import { getIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

const tones = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success-strong",
  neutral: "bg-background text-muted-foreground",
} as const;

type IconTileProps = { icon: string; tone?: keyof typeof tones; className?: string };

export function IconTile({ icon, tone = "primary", className }: IconTileProps) {
  const Icon = getIcon(icon);
  return (
    <span className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-xl", tones[tone], className)}>
      <Icon className="size-5" aria-hidden />
    </span>
  );
}
