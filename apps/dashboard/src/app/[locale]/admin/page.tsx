'use client';

import Link from 'next/link';
import { useAdminStats, useAdminSellers, useAdminOrders } from '@/lib/queries/admin';
import { Badge } from '@/components/ui/Badge';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[#141414] rounded-xl border border-[#2a2a2a] p-5">
      <p className="text-xs text-[#666] mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#C6FF33]">{value}</p>
      {sub && <p className="text-xs text-[#555] mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminOverviewPage() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: sellersData } = useAdminSellers(5);
  const { data: ordersData } = useAdminOrders(5);

  const recentSellers = sellersData?.sellers ?? [];
  const recentOrders = ordersData?.orders ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-[#555] text-sm mt-0.5">Platform at a glance</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Sellers" value={statsLoading ? '…' : (stats?.totalSellers ?? 0)} />
        <StatCard label="Active Sellers" value={statsLoading ? '…' : (stats?.activeSellers ?? 0)} />
        <StatCard label="New This Week" value={statsLoading ? '…' : (stats?.newThisWeek ?? 0)} />
        <StatCard label="Total Orders" value={statsLoading ? '…' : (stats?.totalOrders ?? 0)} />
        <StatCard label="Pending Orders" value={statsLoading ? '…' : (stats?.pendingOrders ?? 0)} />
        <StatCard
          label="Avg Risk Score (7d)"
          value={statsLoading ? '…' : stats?.avgRiskScore != null ? `${Math.round(stats.avgRiskScore * 100)}%` : '—'}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent signups */}
        <div className="bg-[#141414] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a]">
            <h2 className="font-semibold text-white text-sm">Recent Sellers</h2>
            <Link href="admin/sellers" className="text-xs text-[#C6FF33] hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-[#1e1e1e]">
            {recentSellers.length === 0 && (
              <p className="text-[#555] text-sm text-center py-8">No sellers yet</p>
            )}
            {recentSellers.map((s) => (
              <div key={s.sellerId} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-white text-sm font-medium">{s.businessName}</p>
                  <p className="text-[#555] text-xs">{s.email}</p>
                </div>
                <Badge variant={s.status === 'active' ? 'confirmed' : 'cancelled'}>
                  {s.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* High-risk orders */}
        <div className="bg-[#141414] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a]">
            <h2 className="font-semibold text-white text-sm">Recent Orders</h2>
            <Link href="admin/orders" className="text-xs text-[#C6FF33] hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-[#1e1e1e]">
            {recentOrders.length === 0 && (
              <p className="text-[#555] text-sm text-center py-8">No orders yet</p>
            )}
            {recentOrders.map((o) => (
              <div key={o.orderId} className="flex items-center justify-between px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{o.customerName}</p>
                  <p className="text-[#555] text-xs truncate">{o.sellerBusinessName} · {o.productName}</p>
                </div>
                <Badge variant={o.riskScore != null && o.riskScore >= 0.7 ? 'risk' : o.status === 'confirmed' ? 'confirmed' : 'pending'}>
                  {o.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
