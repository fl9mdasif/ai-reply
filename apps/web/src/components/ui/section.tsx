import { cn } from "@/lib/utils";
import { Container } from "./container";

const tones = {
  plain: "bg-surface",
  muted: "bg-background",
  brand: "bg-primary-deep text-primary-foreground",
} as const;

type SectionProps = {
  id?: string;
  tone?: keyof typeof tones;
  className?: string;
  containerClassName?: string;
  children: React.ReactNode;
};

/** A full-width band with consistent vertical rhythm and an inner Container. */
export function Section({ id, tone = "plain", className, containerClassName, children }: SectionProps) {
  return (
    <section id={id} className={cn("scroll-mt-20 py-20 sm:py-24", tones[tone], className)}>
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}
