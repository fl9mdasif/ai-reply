'use client';

import { useState, FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { useInviteCodes, useCreateInviteCode } from '@/lib/queries/admin';

export default function InviteCodesPage() {
  const { data, isLoading } = useInviteCodes();
  const createCode = useCreateInviteCode();

  const [code, setCode] = useState('');
  const [maxUses, setMaxUses] = useState('10');
  const [expiresAt, setExpiresAt] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const codes = data?.codes ?? [];

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!code.trim()) { setError('Code is required'); return; }
    try {
      await createCode.mutateAsync({
        code: code.trim().toUpperCase(),
        maxUses: parseInt(maxUses, 10) || 1,
        ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
      });
      setCode(''); setMaxUses('10'); setExpiresAt(''); setShowForm(false);
    } catch (err) {
      setError((err as Error).message ?? 'Failed to create code');
    }
  }

  function isExpired(c: { expiresAt?: string; usedCount: number; maxUses: number }) {
    if (c.usedCount >= c.maxUses) return true;
    if (c.expiresAt && new Date(c.expiresAt) < new Date()) return true;
    return false;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Invite Codes</h1>
          <p className="text-[#555] text-sm mt-0.5">{codes.length} codes</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#C6FF33] text-black text-sm font-semibold hover:bg-[#b8f02a]"
        >
          <Plus size={14} />
          Generate code
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={(e) => { void handleCreate(e); }} className="bg-[#141414] rounded-xl border border-[#2a2a2a] p-5 mb-4 space-y-3">
          <h2 className="font-semibold text-white text-sm">New Invite Code</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#555] mb-1">Code *</label>
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="BETA2026"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#111] border border-[#333] text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#C6FF33] placeholder-[#444]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#555] mb-1">Max Uses</label>
              <input
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#111] border border-[#333] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C6FF33]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#555] mb-1">Expires (optional)</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#111] border border-[#333] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C6FF33]"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a2a] text-sm text-[#666] hover:bg-[#1a1a1a]">
              Cancel
            </button>
            <button type="submit" disabled={createCode.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#C6FF33] text-black text-sm font-semibold hover:bg-[#b8f02a] disabled:opacity-60">
              {createCode.isPending ? 'Creating…' : 'Create code'}
            </button>
          </div>
        </form>
      )}

      {/* Codes table */}
      <div className="bg-[#141414] rounded-xl border border-[#2a2a2a] overflow-hidden">
        {isLoading ? (
          <p className="text-center text-[#555] text-sm py-12">Loading…</p>
        ) : codes.length === 0 ? (
          <p className="text-center text-[#555] text-sm py-12">No invite codes yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#555] border-b border-[#2a2a2a]">
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Uses</th>
                  <th className="px-5 py-3 font-medium">Expires</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.code} className="border-b border-[#1e1e1e] last:border-0">
                    <td className="px-5 py-3 font-mono font-semibold text-[#C6FF33]">{c.code}</td>
                    <td className="px-5 py-3 text-[#aaa]">
                      {c.usedCount} / {c.maxUses}
                    </td>
                    <td className="px-5 py-3 text-[#666] text-xs">
                      {c.expiresAt
                        ? new Date(c.expiresAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-[#555] text-xs">
                      {new Date(c.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isExpired(c) ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                        {isExpired(c) ? 'Exhausted' : 'Active'}
                      </span>
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
