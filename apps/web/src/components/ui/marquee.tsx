import { cn } from "@/lib/utils";

type MarqueeProps = { items: string[]; className?: string };

/**
 * Endless horizontal scroll of names. The list is rendered twice so the
 * -50% translate loops seamlessly; the copy is hidden from screen readers.
 * Pauses on hover; under reduced motion it becomes a static wrapped list.
 */
export function Marquee({ items, className }: MarqueeProps) {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-10 pr-10 motion-reduce:flex-wrap motion-reduce:justify-center">
      {items.map((item) => (
        <li key={item} className="whitespace-nowrap text-lg font-semibold tracking-tight text-muted-foreground/80">
          {item}
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className={cn(
        "group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] motion-reduce:[mask-image:none]",
        className,
      )}
    >
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:w-full motion-reduce:animate-none">
        {row(false)}
        <span className="contents motion-reduce:hidden">{row(true)}</span>
      </div>
    </div>
  );
}
