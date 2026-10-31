import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium",
  {
    variants: {
      tone: {
        primary: "bg-primary-soft text-primary",
        success: "bg-success-soft text-success-strong",
        warning: "bg-warning-soft text-warning-strong",
        danger: "bg-danger-soft text-danger-strong",
        neutral: "border bg-surface text-muted-foreground",
      },
      size: {
        sm: "px-2.5 py-0.5 text-xs",
        md: "px-3.5 py-1 text-sm",
      },
    },
    defaultVariants: { tone: "primary", size: "sm" },
  },
);

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}
