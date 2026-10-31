"use client";

import { motion } from "framer-motion";

const orders = [
  { name: "Fatema Begum", product: "Kantha Jacket", risk: "low" as const, status: "Confirmed" },
  { name: "Raihan Hossain", product: "Cotton Saree", risk: "medium" as const, status: "Pending" },
  { name: "Unknown #219", product: "3× Mixed lot", risk: "high" as const, status: "Flagged" },
];

const riskStyles = {
  low: { bg: "bg-green-100", text: "text-green-700", label: "Low" },
  medium: { bg: "bg-amber-100", text: "text-amber-700", label: "Med" },
  high: { bg: "bg-red-100", text: "text-red-700", label: "High" },
};

export default function DashboardMockup() {
  return (
    <div className="relative w-full max-w-[420px]">
      {/* floating order notification */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-4 -right-2 sm:-right-6 bg-white border border-[#EDE9FE] shadow-xl rounded-2xl px-4 py-2.5 flex items-center gap-2 z-10"
      >
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
        <span className="text-xs font-semibold text-[#09090B] whitespace-nowrap">নতুন অর্ডার আসছে</span>
      </motion.div>

      {/* main dashboard card */}
      <div className="bg-white border border-[#EDE9FE] rounded-2xl shadow-2xl shadow-[#7D39EB]/8 overflow-hidden">
        {/* header bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EDE9FE]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#7D39EB] rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">J</span>
            </div>
            <span className="text-sm font-semibold text-[#09090B]">jobabai</span>
          </div>
          <span className="text-xs text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full font-medium">
            ● Live
          </span>
        </div>

        {/* stat tiles */}
        <div className="grid grid-cols-3 divide-x divide-[#EDE9FE] border-b border-[#EDE9FE]">
          {[
            { label: "Today", value: "142" },
            { label: "Pending", value: "7" },
            { label: "Blocked", value: "3" },
          ].map((s) => (
            <div key={s.label} className="px-4 py-3 text-center">
              <p className="text-xl font-extrabold text-[#09090B]">{s.value}</p>
              <p className="text-xs text-[#71717A]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* orders list */}
        <div className="px-5 py-4">
          <p className="text-xs font-semibold text-[#71717A] uppercase tracking-wide mb-3">
            Recent Orders
          </p>
          <div className="space-y-3">
            {orders.map((order, i) => {
              const risk = riskStyles[order.risk];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.12, duration: 0.3 }}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#09090B] truncate">{order.name}</p>
                    <p className="text-xs text-[#71717A] truncate">{order.product}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${risk.bg} ${risk.text}`}
                    >
                      {risk.label}
                    </span>
                    <span className="text-xs text-[#71717A]">{order.status}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* footer */}
        <div className="px-5 py-3 bg-[#F8F7FF] border-t border-[#EDE9FE] flex items-center justify-between">
          <span className="text-xs text-[#71717A]">Google Sheets synced ✓</span>
          <span className="text-xs font-medium text-[#7D39EB] cursor-pointer hover:underline">
            View all →
          </span>
        </div>
      </div>
    </div>
  );
}
