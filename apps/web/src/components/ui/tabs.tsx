"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Tab = { title: string; body: string };

type TabsProps = {
  tabs: Tab[];
  /** One pre-rendered panel per tab, in the same order. */
  panels: React.ReactNode[];
  label: string;
};

/** Numbered vertical tabs (WAI-ARIA tablist) with a panel beside them. */
export function Tabs({ tabs, panels, label }: TabsProps) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (active + step + tabs.length) % tabs.length;
    setActive(next);
    refs.current[next]?.focus();
  }

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
      <div role="tablist" aria-label={label} aria-orientation="vertical" className="flex flex-col gap-3" onKeyDown={onKeyDown}>
        {tabs.map((tab, i) => {
          const selected = i === active;
          return (
            <button
              key={tab.title}
              ref={(el) => {
                refs.current[i] = el;
              }}
              id={`${baseId}-tab${i}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${baseId}-panel${i}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              className={cn(
                "flex gap-4 rounded-2xl border p-5 text-left transition-colors duration-200",
                selected ? "border-primary/40 bg-surface shadow-card" : "border-transparent hover:bg-surface/70",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  selected ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary",
                )}
              >
                {i + 1}
              </span>
              <span>
                <span className="block font-semibold text-foreground">{tab.title}</span>
                <span className="mt-1 block text-[0.95rem] text-muted-foreground">{tab.body}</span>
              </span>
            </button>
          );
        })}
      </div>

      {panels.map((panel, i) => (
        <div
          key={i}
          id={`${baseId}-panel${i}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab${i}`}
          hidden={i !== active}
          className="min-w-0"
        >
          {panel}
        </div>
      ))}
    </div>
  );
}
