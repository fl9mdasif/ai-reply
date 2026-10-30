'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useOrders, useUpdateOrderStatus, useRetrySheets, type Order } from '@/lib/queries/orders';
import { Badge } from '@/components/ui/Badge';
import { OrderSlideOver } from '@/components/seller/OrderSlideOver';

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'cancelled';

const TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function riskBadgeVariant(score: number | null) {
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

export default function OrdersPage() {
  const { data, isLoading } = useOrders(100);
  const updateStatus = useUpdateOrderStatus();
  const retrySheets = useRetrySheets();

  const [tab, setTab] = useState<StatusFilter>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const allOrders = data?.orders ?? [];
  const orders = tab === 'all' ? allOrders : allOrders.filter((o) => o.status === tab);

  const counts: Record<StatusFilter, number> = {
    all: allOrders.length,
    pending: allOrders.filter((o) => o.status === 'pending').length,
    confirmed: allOrders.filter((o) => o.status === 'confirmed').length,
    cancelled: allOrders.filter((o) => o.status === 'cancelled').length,
  };

  async function confirm(orderId: string) {
    await updateStatus.mutateAsync({ orderId, status: 'confirmed' });
  }

  async function cancel(orderId: string) {
    await updateStatus.mutateAsync({ orderId, status: 'cancelled' });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#09090B]">Orders</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">{allOrders.length} total</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 border-b border-[#EDE9FE]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative bottom-[-1px] border border-transparent ${
              tab === t.key
                ? 'text-[#7D39EB] border-[#EDE9FE] border-b-white bg-white'
                : 'text-[#6B7280] hover:text-[#09090B]'
            }`}
          >
            {t.label}
            <span className={`ml-1.5 text-xs font-mono ${tab === t.key ? 'text-[#7D39EB]' : 'text-[#9CA3AF]'}`}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#EDE9FE]">
        {isLoading ? (
          <p className="text-center text-[#9CA3AF] text-sm py-12">Loading…</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#6B7280] text-sm">
              {tab === 'all' ? 'No orders yet. Connect your Facebook Page to start.' : `No ${tab} orders.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#6B7280] border-b border-[#EDE9FE]">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Risk</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.orderId}
                    className="border-b border-[#F3F0FF] last:border-0 hover:bg-[#FAFAFE] cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-[#9CA3AF]">
                        #{order.orderId.slice(-6).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#09090B] max-w-[120px] truncate">
                      {order.customerName}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] max-w-[120px] truncate">{order.productName}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{order.quantity}</td>
                    <td className="px-4 py-3 text-[#6B7280] font-mono text-xs">{order.phone}</td>
                    <td className="px-4 py-3">
                      <Badge variant={riskBadgeVariant(order.riskScore)}>
                        {riskLabel(order.riskScore)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          order.status === 'confirmed'
                            ? 'confirmed'
                            : order.status === 'cancelled'
                            ? 'cancelled'
                            : 'pending'
                        }
                      >
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[#9CA3AF] text-xs whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {order.status === 'pending' && (
                          <>
                            <button
                              onClick={() => { void confirm(order.orderId); }}
                              disabled={updateStatus.isPending}
                              className="px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 whitespace-nowrap"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => { void cancel(order.orderId); }}
                              disabled={updateStatus.isPending}
                              className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => retrySheets.mutate(order.orderId)}
                          disabled={retrySheets.isPending}
                          className="p-1.5 rounded-md hover:bg-[#F3F0FF] text-[#9CA3AF] hover:text-[#7D39EB]"
                          title="Retry Google Sheets sync"
                        >
                          <RefreshCw size={13} className={retrySheets.isPending ? 'animate-spin' : ''} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order detail slide-over */}
      {selectedOrder && (
        <OrderSlideOver
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}
