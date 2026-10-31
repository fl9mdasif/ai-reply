"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Plan } from "../types";

type Labels = {
  billingLabel: string;
  monthly: string;
  annual: string;
  annualSave: string;
  perMonth: string;
  billedAnnually: string;
  popular: string;
};

type PricingPlansProps = { plans: Plan[]; labels: Labels; ctaHref: string };

/** Billing toggle + plan cards; the toggle switches every plan's shown price. */
export function PricingPlans({ plans, labels, ctaHref }: PricingPlansProps) {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <div role="radiogroup" aria-label={labels.billingLabel} className="mx-auto mt-10 flex w-fit rounded-xl border bg-surface p-1">
        {[false, true].map((isAnnual) => (
          <button
            key={String(isAnnual)}
            type="button"
            role="radio"
            aria-checked={annual === isAnnual}
            onClick={() => setAnnual(isAnnual)}
            className={cn(
              "flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
              annual === isAnnual ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {isAnnual ? labels.annual : labels.monthly}
            {isAnnual && <Badge tone="success">{labels.annualSave}</Badge>}
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "relative flex flex-col rounded-3xl border bg-surface p-7 shadow-card",
              plan.popular && "border-primary ring-2 ring-primary/20 lg:-my-2 lg:py-9",
            )}
          >
            {plan.popular && (
              <span className="absolute -top-3.5 left-7 rounded-full bg-primary px-3.5 py-1 text-sm font-medium text-primary-foreground">
                {labels.popular}
              </span>
            )}
            <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
            <p className="mt-1 text-[0.95rem] text-muted-foreground">{plan.description}</p>

            <p className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight text-foreground">
                {annual ? plan.annualPrice : plan.price}
              </span>
              <span className="text-muted-foreground">{labels.perMonth}</span>
            </p>
            <p className="mt-1 h-5 text-sm text-muted-foreground">{annual ? labels.billedAnnually : ""}</p>
            <p className="mt-4 rounded-xl bg-primary-soft px-3 py-2 text-sm font-medium text-primary">{plan.limit}</p>

            <ul className="mt-6 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2.5 text-[0.95rem] text-foreground">
                  <Check className="mt-1 size-4 shrink-0 text-success" aria-hidden />
                  {feature}
                </li>
              ))}
            </ul>

            <ButtonLink href={ctaHref} variant={plan.popular ? "primary" : "secondary"} size="lg" className="mt-8 w-full">
              {plan.cta}
            </ButtonLink>
          </div>
        ))}
      </div>
    </>
  );
}
