import { Badge } from "@/components/ui/badge";
import type { Risk } from "../types";

const tone = { low: "success", medium: "warning", high: "danger" } as const;

export function RiskBadge({ risk, label }: { risk: Risk; label: string }) {
  return (
    <Badge tone={tone[risk]}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </Badge>
  );
}
