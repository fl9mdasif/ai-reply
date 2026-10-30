'use client';

import { X, Phone, MapPin, ShoppingBag, AlertTriangle, Calendar, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { Order } from '@/lib/queries/orders';

const RISK_FLAG_LABELS: Record<string, string> = {
  HIGH_QTY: 'অস্বাভাবিক পরিমাণ',
  INVALID_PHONE: 'ফোন নম্বর সঠিক নয়',
  SUSPICIOUS_ADDRESS: 'সন্দেহজনক ঠিকানা',
  malformed_phone: 'ফোন নম্বর সঠিক নয়',
  high_quantity: 'অস্বাভাবিক পরিমাণ',
  suspicious_address: 'সন্দেহজনক ঠিকানা',
};

function riskVariant(score: number | null) {
  if (score === null) return 'default';
  if (score >= 0.7) return 'risk';
  if (score >= 0.3) return 'pending';
  return 'confirmed';
}

function riskLabel(score: number | null) {
  if (score === null) return 'N/A';
  const pct = Math.round(score * 100);
  if (score >= 0.7) return `High ${pct}%`;
  if (score >= 0.3) return `Medium ${pct}%`;
  return `Low ${pct}%`;
}

interface Props {
  order: Order;
  onClose: () => void;
}

export function OrderSlideOver({ order, onClose }: Props) {
  const statusVariant = (s: string) =>
    s === 'confirmed' ? 'confirmed' : s === 'cancelled' ? 'cancelled' : 'pending';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE9FE]">
          <div>
            <p className="text-xs text-[#9CA3AF] font-mono mb-0.5">#{order.orderId.slice(-8).toUpperCase()}</p>
            <h2 className="font-semibold text-[#09090B] text-lg">{order.customerName}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#F3F0FF] text-[#6B7280]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Status + risk row */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={statusVariant(order.status)}>
              {order.status}
            </Badge>
            <Badge variant={riskVariant(order.riskScore)}>
              Risk: {riskLabel(order.riskScore)}
            </Badge>
            <span className="text-xs text-[#9CA3AF] ml-auto">
              {new Date(order.createdAt).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </span>
          </div>

          {/* Order info */}
          <div className="bg-[#F8F7FF] rounded-xl p-4 space-y-3">
            <InfoRow icon={<ShoppingBag size={15} />} label="Product" value={order.productName} />
            <InfoRow icon={<Hash size={15} />} label="Quantity" value={String(order.quantity)} />
            <InfoRow icon={<Phone size={15} />} label="Phone" value={order.phone} />
            <InfoRow icon={<MapPin size={15} />} label="Address" value={order.address} />
            <InfoRow icon={<Calendar size={15} />} label="Ordered" value={new Date(order.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} />
          </div>

          {/* Risk flags */}
          {order.riskFlags.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-[#EF4444]" />
                <p className="text-sm font-medium text-[#09090B]">Risk Flags</p>
              </div>
              <div className="space-y-2">
                {order.riskFlags.map((flag) => (
                  <div
                    key={flag.code}
                    className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100"
                  >
                    <span className="text-xs font-mono text-red-500 mt-0.5 flex-none">{flag.code}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-red-700">
                        {RISK_FLAG_LABELS[flag.code] ?? flag.code}
                      </p>
                      {flag.reason && (
                        <p className="text-xs text-red-500 mt-0.5">{flag.reason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No flags */}
          {order.riskFlags.length === 0 && order.riskScore !== null && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-100">
              <span className="text-green-600 text-sm">No risk flags detected.</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[#9CA3AF] mt-0.5 flex-none">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#9CA3AF] mb-0.5">{label}</p>
        <p className="text-sm text-[#09090B] font-medium break-words">{value}</p>
      </div>
    </div>
  );
}
