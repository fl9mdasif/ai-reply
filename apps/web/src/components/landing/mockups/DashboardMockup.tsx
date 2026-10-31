import { getTranslations } from "next-intl/server";
import type { LabelValue, OrderRow, Risk } from "../types";
import { RiskBadge } from "./RiskBadge";

/** A slice of the seller dashboard: today's stats and the order list. */
export async function DashboardMockup() {
  const t = await getTranslations("dashboardMockup");
  const stats = t.raw("stats") as LabelValue[];
  const columns = t.raw("columns") as string[];
  const rows = t.raw("rows") as OrderRow[];
  const riskLabels = t.raw("riskLabels") as Record<Risk, string>;

  return (
    <div className="w-full rounded-3xl border bg-surface p-5 shadow-float sm:p-6">
      <h3 className="text-lg font-semibold text-foreground">{t("title")}</h3>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-background p-3">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className="mt-1 text-2xl font-bold text-foreground">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[26rem] text-left text-sm">
          <thead className="bg-background text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th key={c} scope="col" className="px-4 py-2.5 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.name}>
                <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.product}</td>
                <td className="px-4 py-3 text-foreground">{r.total}</td>
                <td className="px-4 py-3">
                  <RiskBadge risk={r.risk} label={riskLabels[r.risk]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
