'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { setToken } from '@/lib/auth';
import { AuthShell } from '@/components/auth/AuthShell';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function RegisterPage({ params }: { params: { locale: string } }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body: Record<string, string> = { businessName, email, password };
      if (inviteCode.trim()) body['inviteCode'] = inviteCode.trim();

      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { token?: string; error?: { message?: string } };
      if (!res.ok) {
        setError(data.error?.message ?? 'Registration failed');
        return;
      }
      if (data.token) {
        setToken(data.token);
        router.push(`/${params.locale}/seller`);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell locale={params.locale} title={t('registerTitle')} subtitle={t('trialNote')}>
        <div>
          <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#09090B] mb-1.5">
                {t('businessName')}
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your Shop Name"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] bg-white text-[#09090B] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#7D39EB] focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#09090B] mb-1.5">
                {t('email')}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] bg-white text-[#09090B] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#7D39EB] focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#09090B] mb-1.5">
                {t('password')}
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] bg-white text-[#09090B] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#7D39EB] focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#09090B] mb-1.5">
                {t('inviteCode')}
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="XXXX-XXXX"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#EDE9FE] bg-white text-[#09090B] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#7D39EB] focus:border-transparent text-sm"
              />
            </div>

            {error && (
              <p className="text-[#EF4444] text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#7D39EB] hover:bg-[#6B2ED6] disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors text-sm mt-2"
            >
              {loading ? t('registering') : t('register')}
            </button>
          </form>

          <p className="text-center text-sm text-[#6B7280] mt-6">
            {t('hasAccount')}{' '}
            <Link
              href={`/${params.locale}/auth/login`}
              className="text-[#7D39EB] font-medium hover:underline"
            >
              {t('login')}
            </Link>
          </p>
          <p className="text-center text-xs text-[#9CA3AF] mt-4">{t('terms')}</p>
        </div>
    </AuthShell>
  );
}
