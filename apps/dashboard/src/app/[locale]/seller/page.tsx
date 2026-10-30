'use client';

import Link from 'next/link';
import { useOrders } from '@/lib/queries/orders';
import { useCatalog } from '@/lib/queries/catalog';
import { Badge } from '@/components/ui/Badge';

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#EDE9FE] p-5">
      <p className="text-xs text-[#6B7280] mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

export default function SellerOverviewPage() {
  const { data: ordersData, isLoading: ordersLoading } = useOrders(50);
  const { data: catalogData, isLoading: catalogLoading } = useCatalog(100);

  const orders = ordersData?.orders ?? [];
  const total = orders.length;
  const pending = orders.filter((o) => o.status === 'pending').length;
  const confirmed = orders.filter((o) => o.status === 'confirmed').length;
  const cancelled = orders.filter((o) => o.status === 'cancelled').length;
  const catalogCount = catalogData?.products.length ?? 0;
  const recentOrders = orders.slice(0, 10);

  const statusVariant = (s: string) =>
    s === 'confirmed' ? 'confirmed' : s === 'cancelled' ? 'cancelled' : 'pending';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#09090B]">Overview</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">Your business at a glance</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Orders" value={ordersLoading ? '…' : total} color="#7D39EB" />
        <StatCard label="Pending" value={ordersLoading ? '…' : pending} color="#F59E0B" />
        <StatCard label="Confirmed" value={ordersLoading ? '…' : confirmed} color="#22C55E" />
        <StatCard label="Cancelled" value={ordersLoading ? '…' : cancelled} color="#6B7280" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#EDE9FE] p-5">
          <p className="text-xs text-[#6B7280] mb-1">Products in Catalog</p>
          <p className="text-2xl font-bold text-[#7D39EB]">{catalogLoading ? '…' : catalogCount}</p>
          <Link href="seller/catalog" className="text-xs text-[#7D39EB] mt-2 inline-block hover:underline">
            Manage catalog →
          </Link>
        </div>
        <div className="bg-white rounded-xl border border-[#EDE9FE] p-5">
          <p className="text-xs text-[#6B7280] mb-1">High-Risk Orders</p>
          <p className="text-2xl font-bold text-[#EF4444]">
            {ordersLoading ? '…' : orders.filter((o) => (o.riskScore ?? 0) > 0.7).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#EDE9FE] p-5">
          <p className="text-xs text-[#6B7280] mb-1">Unsynced Products</p>
          <p className="text-2xl font-bold text-[#F59E0B]">
            {catalogLoading ? '…' : (catalogData?.products.filter((p) => p.embedStatus === 'failed').length ?? 0)}
          </p>
        </div>
      </div>

      {/* Recent orders table */}
      <div className="bg-white rounded-xl border border-[#EDE9FE]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE9FE]">
          <h2 className="font-semibold text-[#09090B]">Recent Orders</h2>
          <Link href="seller/orders" className="text-sm text-[#7D39EB] hover:underline">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          {ordersLoading ? (
            <p className="text-[#9CA3AF] text-sm text-center py-10">Loading…</p>
          ) : recentOrders.length === 0 ? (
            <p className="text-[#9CA3AF] text-sm text-center py-10">
              No orders yet. Connect your Facebook Page to start.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#6B7280] border-b border-[#EDE9FE]">
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Qty</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.orderId} className="border-b border-[#F3F0FF] last:border-0 hover:bg-[#FAFAFE]">
                    <td className="px-5 py-3 font-medium text-[#09090B]">{order.customerName}</td>
                    <td className="px-5 py-3 text-[#6B7280]">{order.productName}</td>
                    <td className="px-5 py-3 text-[#6B7280]">{order.quantity}</td>
                    <td className="px-5 py-3">
                      <Badge variant={statusVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-[#9CA3AF]">
                      {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
