// Shapes of the array content read with `t.raw()` from messages/*.json.

export type ChatMessage = { from: "customer" | "bot"; text: string };
export type IconItem = { icon: string; title: string; body: string };
export type Step = { title: string; body: string };
export type LabelValue = { label: string; value: string };
export type Risk = "low" | "medium" | "high";
export type OrderRow = { name: string; product: string; total: string; risk: Risk };
export type Integration = { icon: string; name: string };
export type FaqItem = { q: string; a: string };

export type ResultItem = {
  placeholder?: boolean;
  metric: string;
  metricLabel: string;
  period: string;
  quote: string;
  name: string;
  shop: string;
};

export type Plan = {
  name: string;
  description: string;
  price: string;
  annualPrice: string;
  limit: string;
  popular?: boolean;
  features: string[];
  cta: string;
};

export type Addon = { name: string; price: string; unit: string };
