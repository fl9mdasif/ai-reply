'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useAdminSellers, useUpdateSellerStatus, useUpdateSellerPlan, type AdminSeller } from '@/lib/queries/admin';
import { Badge } from '@/components/ui/Badge';

const PLANS = ['starter', 'pro', 'enterprise'];

function PlanModal({ seller, onClose }: { seller: AdminSeller; onClose: () => void }) {
  const [plan, setPlan] = useState(seller.plan);
  const updatePlan = useUpdateSellerPlan();

  async function save() {
    await updatePlan.mutateAsync({ sellerId: seller.sellerId, plan });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm">
        <h3 className="font-semibold text-white mb-1">Change Plan</h3>
        <p className="text-sm text-[#666] mb-4">{seller.businessName}</p>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg bg-[#111] border border-[#333] text-white text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#C6FF33]"
        >
          {PLANS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a2a] text-sm text-[#666] hover:bg-[#222]">
            Cancel
          </button>
          <button
            onClick={() => { void save(); }}
            disabled={updatePlan.isPending}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[#C6FF33] text-black text-sm font-semibold hover:bg-[#b8f02a] disabled:opacity-60"
          >
            {updatePlan.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSellersPage() {
  const { data, isLoading } = useAdminSellers(100);
  const updateStatus = useUpdateSellerStatus();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [planModal, setPlanModal] = useState<AdminSeller | null>(null);

  const sellers = (data?.sellers ?? []).filter((s) => {
    const matchSearch = s.businessName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Sellers</h1>
        <p className="text-[#555] text-sm mt-0.5">{data?.sellers.length ?? 0} total</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full pl-8 pr-4 py-2.5 rounded-lg bg-[#141414] border border-[#2a2a2a] text-white text-sm placeholder-[#555] focus:outline-none focus:ring-2 focus:ring-[#C6FF33]"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'active', 'suspended'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                statusFilter === f
                  ? 'bg-[#C6FF33] text-black'
                  : 'bg-[#141414] border border-[#2a2a2a] text-[#666] hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#141414] rounded-xl border border-[#2a2a2a] overflow-hidden">
        {isLoading ? (
          <p className="text-center text-[#555] text-sm py-12">Loading…</p>
        ) : sellers.length === 0 ? (
          <p className="text-center text-[#555] text-sm py-12">No sellers found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#555] border-b border-[#2a2a2a]">
                  <th className="px-5 py-3 font-medium">Business</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((s) => (
                  <tr key={s.sellerId} className="border-b border-[#1e1e1e] last:border-0 hover:bg-[#1a1a1a]">
                    <td className="px-5 py-3">
                      <Link
                        href={`admin/sellers/${s.sellerId}`}
                        className="text-white font-medium hover:text-[#C6FF33]"
                      >
                        {s.businessName}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-[#666]">{s.email}</td>
                    <td className="px-5 py-3">
                      <span className="text-[#aaa] capitalize">{s.plan}</span>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={s.status === 'active' ? 'confirmed' : 'cancelled'}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-[#555] text-xs">
                      {new Date(s.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPlanModal(s)}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#1e1e1e] text-[#aaa] hover:bg-[#252525] hover:text-white"
                        >
                          Plan
                        </button>
                        <button
                          onClick={() => updateStatus.mutate({
                            sellerId: s.sellerId,
                            status: s.status === 'active' ? 'suspended' : 'active',
                          })}
                          disabled={updateStatus.isPending}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium disabled:opacity-50 ${
                            s.status === 'active'
                              ? 'bg-red-900/40 text-red-400 hover:bg-red-900/60'
                              : 'bg-green-900/40 text-green-400 hover:bg-green-900/60'
                          }`}
                        >
                          {s.status === 'active' ? 'Suspend' : 'Activate'}
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

      {planModal && <PlanModal seller={planModal} onClose={() => setPlanModal(null)} />}
    </div>
  );
}
