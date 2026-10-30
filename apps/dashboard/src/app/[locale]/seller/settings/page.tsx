'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useSellerMe } from '@/lib/queries/integrations';
import { useUpdateSettings, useChangePassword } from '@/lib/queries/conversations';

export default function SettingsPage() {
  const { data: seller, isLoading } = useSellerMe();
  const updateSettings = useUpdateSettings();
  const changePassword = useChangePassword();

  const [businessName, setBusinessName] = useState('');
  const [fallback, setFallback] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

  useEffect(() => {
    if (seller) {
      setBusinessName(seller.businessName ?? '');
    }
  }, [seller]);

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault();
    await updateSettings.mutateAsync({
      businessName: businessName.trim(),
      ...(fallback.trim() ? { fallbackMessage: fallback.trim() } : {}),
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwError('');
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    try {
      await changePassword.mutateAsync({ currentPassword: currentPw, newPassword: newPw });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 3000);
    } catch (err) {
      setPwError((err as Error).message ?? 'Failed to change password');
    }
  }

  if (isLoading) return <p className="text-[#9CA3AF] text-sm">Loading…</p>;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#09090B]">Settings</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">Manage your business profile</p>
      </div>

      {/* ── Account info (read-only) ── */}
      <div className="bg-white rounded-xl border border-[#EDE9FE] p-5 space-y-3">
        <h2 className="font-semibold text-[#09090B] text-sm">Account</h2>
        <div>
          <label className="text-xs text-[#9CA3AF]">Email</label>
          <p className="text-sm text-[#09090B] font-medium mt-0.5">{seller?.email}</p>
        </div>
        <div>
          <label className="text-xs text-[#9CA3AF]">Plan</label>
          <p className="text-sm text-[#09090B] font-medium mt-0.5 capitalize">{seller?.plan ?? 'starter'}</p>
        </div>
      </div>

      {/* ── Business settings ── */}
      <form onSubmit={(e) => { void handleSaveSettings(e); }} className="bg-white rounded-xl border border-[#EDE9FE] p-5 space-y-4">
        <h2 className="font-semibold text-[#09090B] text-sm">Business</h2>

        <div>
          <label className="block text-sm font-medium text-[#09090B] mb-1.5">Business Name</label>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Your business name"
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] text-sm focus:outline-none focus:ring-2 focus:ring-[#7D39EB]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#09090B] mb-1.5">AI Fallback Message</label>
          <textarea
            rows={3}
            value={fallback}
            onChange={(e) => setFallback(e.target.value)}
            placeholder="Message sent when AI cannot answer (e.g. 'আমি এখন ব্যস্ত, একটু পরে যোগাযোগ করুন')"
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] text-sm focus:outline-none focus:ring-2 focus:ring-[#7D39EB] resize-none"
          />
          <p className="text-xs text-[#9CA3AF] mt-1">Sent when the AI cannot find a relevant answer in your catalog.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={updateSettings.isPending}
            className="px-4 py-2.5 rounded-lg bg-[#7D39EB] text-white text-sm font-medium hover:bg-[#6B2ED6] disabled:opacity-60"
          >
            {updateSettings.isPending ? 'Saving…' : 'Save changes'}
          </button>
          {settingsSaved && <span className="text-sm text-green-600">Saved!</span>}
        </div>
      </form>

      {/* ── Change password ── */}
      <form onSubmit={(e) => { void handleChangePassword(e); }} className="bg-white rounded-xl border border-[#EDE9FE] p-5 space-y-4">
        <h2 className="font-semibold text-[#09090B] text-sm">Change Password</h2>

        <div>
          <label className="block text-sm font-medium text-[#09090B] mb-1.5">Current Password</label>
          <input
            type="password"
            required
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] text-sm focus:outline-none focus:ring-2 focus:ring-[#7D39EB]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#09090B] mb-1.5">New Password</label>
          <input
            type="password"
            required
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] text-sm focus:outline-none focus:ring-2 focus:ring-[#7D39EB]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#09090B] mb-1.5">Confirm New Password</label>
          <input
            type="password"
            required
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] text-sm focus:outline-none focus:ring-2 focus:ring-[#7D39EB]"
          />
        </div>

        {pwError && <p className="text-sm text-red-500">{pwError}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={changePassword.isPending}
            className="px-4 py-2.5 rounded-lg bg-[#09090B] text-white text-sm font-medium hover:bg-[#1a1a1a] disabled:opacity-60"
          >
            {changePassword.isPending ? 'Updating…' : 'Update password'}
          </button>
          {pwSaved && <span className="text-sm text-green-600">Password updated!</span>}
        </div>
      </form>

      {/* ── Danger zone ── */}
      <div className="bg-white rounded-xl border border-red-100 p-5">
        <h2 className="font-semibold text-red-600 text-sm mb-2">Danger Zone</h2>
        <p className="text-sm text-[#6B7280] mb-3">
          Account deletion removes all your data permanently. This cannot be undone.
        </p>
        <button
          disabled
          className="px-4 py-2.5 rounded-lg border border-red-200 text-sm font-medium text-red-400 cursor-not-allowed"
        >
          Delete account — contact support
        </button>
      </div>
    </div>
  );
}
