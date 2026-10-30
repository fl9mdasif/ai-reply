'use client';

import { useState } from 'react';
import { useAdminOrders } from '@/lib/queries/admin';
import { Badge } from '@/components/ui/Badge';

type RiskFilter = 'all' | 'high' | 'medium' | 'low';
type StatusFilter = 'all' | 'pending' | 'confirmed' | 'cancelled';

function riskVariant(score: number | null) {
  if (score === null) return 'default';
  if (score >= 0.7) return 'risk';
  if (score >= 0.3) return 'pending';
  return 'confirmed';
}

function riskLabel(score: number | null) {
  if (score === null) return '—';
  const pct = Math.round(score * 100);
  if (score >= 0.7) return `High ${pct}%`;
  if (score >= 0.3) return `Med ${pct}%`;
  return `Low ${pct}%`;
}

export default function AdminOrdersPage() {
  const { data, isLoading } = useAdminOrders(200);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const allOrders = data?.orders ?? [];
  const orders = allOrders.filter((o) => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchRisk =
      riskFilter === 'all' ||
      (riskFilter === 'high' && (o.riskScore ?? 0) >= 0.7) ||
      (riskFilter === 'medium' && (o.riskScore ?? 0) >= 0.3 && (o.riskScore ?? 0) < 0.7) ||
      (riskFilter === 'low' && (o.riskScore ?? 1) < 0.3);
    return matchStatus && matchRisk;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">All Orders</h1>
        <p className="text-[#555] text-sm mt-0.5">{allOrders.length} total across all sellers</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1">
          <span className="text-xs text-[#555] self-center mr-1">Status:</span>
          {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${statusFilter === f ? 'bg-[#C6FF33] text-black' : 'bg-[#141414] border border-[#2a2a2a] text-[#666] hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <span className="text-xs text-[#555] self-center mr-1">Risk:</span>
          {(['all', 'high', 'medium', 'low'] as const).map((f) => (
            <button key={f} onClick={() => setRiskFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${riskFilter === f ? 'bg-[#C6FF33] text-black' : 'bg-[#141414] border border-[#2a2a2a] text-[#666] hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#141414] rounded-xl border border-[#2a2a2a] overflow-hidden">
        {isLoading ? (
          <p className="text-center text-[#555] text-sm py-12">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="text-center text-[#555] text-sm py-12">No orders match filters</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#555] border-b border-[#2a2a2a]">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Seller</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Risk</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.orderId} className="border-b border-[#1e1e1e] last:border-0 hover:bg-[#1a1a1a]">
                    <td className="px-4 py-3 font-mono text-xs text-[#555]">#{o.orderId.slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-3 text-[#aaa] max-w-[120px] truncate">{o.sellerBusinessName}</td>
                    <td className="px-4 py-3 text-white font-medium max-w-[120px] truncate">{o.customerName}</td>
                    <td className="px-4 py-3 text-[#666] max-w-[120px] truncate">{o.productName}</td>
                    <td className="px-4 py-3 text-[#666]">{o.quantity}</td>
                    <td className="px-4 py-3">
                      <Badge variant={riskVariant(o.riskScore)}>{riskLabel(o.riskScore)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={o.status === 'confirmed' ? 'confirmed' : o.status === 'cancelled' ? 'cancelled' : 'pending'}>
                        {o.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[#555] text-xs whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
