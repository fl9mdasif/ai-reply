'use client';

import { use } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useAdminSeller, useUpdateSellerStatus, useUpdateSellerPlan } from '@/lib/queries/admin';
import { Badge } from '@/components/ui/Badge';
import { useState } from 'react';

const PLANS = ['starter', 'pro', 'enterprise'];

export default function SellerDetailPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id } = use(params);
  const { data: seller, isLoading } = useAdminSeller(id);
  const updateStatus = useUpdateSellerStatus();
  const updatePlan = useUpdateSellerPlan();
  const [plan, setPlan] = useState('');

  if (isLoading) return <p className="text-[#555] text-sm">Loading…</p>;
  if (!seller) return <p className="text-red-400 text-sm">Seller not found</p>;

  const currentPlan = plan || seller.plan;

  return (
    <div className="max-w-2xl">
      <Link href="../sellers" className="inline-flex items-center gap-1.5 text-sm text-[#666] hover:text-[#C6FF33] mb-6">
        <ChevronLeft size={14} />
        Back to sellers
      </Link>

      {/* Profile card */}
      <div className="bg-[#141414] rounded-xl border border-[#2a2a2a] p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">{seller.businessName}</h1>
            <p className="text-[#666] text-sm mt-0.5">{seller.email}</p>
          </div>
          <Badge variant={seller.status === 'active' ? 'confirmed' : 'cancelled'}>
            {seller.status}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-[#555] mb-0.5">Joined</p>
            <p className="text-[#aaa]">{new Date(seller.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })}</p>
          </div>
          <div>
            <p className="text-xs text-[#555] mb-0.5">Plan</p>
            <p className="text-[#aaa] capitalize">{seller.plan}</p>
          </div>
          <div>
            <p className="text-xs text-[#555] mb-0.5">Facebook</p>
            <p className="text-[#aaa]">{seller.facebook ? seller.facebook.pageName : 'Not connected'}</p>
          </div>
          <div>
            <p className="text-xs text-[#555] mb-0.5">Google Sheets</p>
            <p className="text-[#aaa]">{seller.sheets ? 'Connected' : 'Not connected'}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-[#141414] rounded-xl border border-[#2a2a2a] p-5 mb-4">
        <h2 className="font-semibold text-white text-sm mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          {/* Change plan */}
          <div className="flex items-center gap-2">
            <select
              value={currentPlan}
              onChange={(e) => setPlan(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#111] border border-[#333] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C6FF33]"
            >
              {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button
              onClick={() => updatePlan.mutate({ sellerId: seller.sellerId, plan: currentPlan })}
              disabled={updatePlan.isPending || currentPlan === seller.plan}
              className="px-3.5 py-2 rounded-lg bg-[#C6FF33] text-black text-sm font-semibold hover:bg-[#b8f02a] disabled:opacity-50"
            >
              {updatePlan.isPending ? 'Saving…' : 'Change plan'}
            </button>
          </div>

          {/* Suspend / Activate */}
          <button
            onClick={() => updateStatus.mutate({
              sellerId: seller.sellerId,
              status: seller.status === 'active' ? 'suspended' : 'active',
            })}
            disabled={updateStatus.isPending}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${
              seller.status === 'active'
                ? 'bg-red-900/40 text-red-400 hover:bg-red-900/60'
                : 'bg-green-900/40 text-green-400 hover:bg-green-900/60'
            }`}
          >
            {updateStatus.isPending ? '…' : seller.status === 'active' ? 'Suspend seller' : 'Activate seller'}
          </button>
        </div>
      </div>

      {/* Orders count */}
      {seller.ordersCount !== undefined && (
        <div className="bg-[#141414] rounded-xl border border-[#2a2a2a] p-5">
          <p className="text-xs text-[#555] mb-0.5">Total Orders</p>
          <p className="text-2xl font-bold text-[#C6FF33]">{seller.ordersCount}</p>
        </div>
      )}
    </div>
  );
}
