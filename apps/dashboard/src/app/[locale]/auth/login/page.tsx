'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { setToken, decodeToken } from '@/lib/auth';
import { AuthShell } from '@/components/auth/AuthShell';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function LoginPage({ params }: { params: { locale: string } }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as { token?: string; error?: { message?: string } };
      if (!res.ok) {
        setError(data.error?.message ?? 'Login failed');
        return;
      }
      if (data.token) {
        setToken(data.token);
        const payload = decodeToken(data.token);
        const dest = payload?.role === 'admin' ? 'admin' : 'seller';
        router.push(`/${params.locale}/${dest}`);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell locale={params.locale} title={t('loginTitle')} subtitle={t('loginSubtitle')}>
        <div>
          <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
              {loading ? t('loggingIn') : t('login')}
            </button>
          </form>

          <p className="text-center text-sm text-[#6B7280] mt-6">
            {t('noAccount')}{' '}
            <Link
              href={`/${params.locale}/auth/register`}
              className="text-[#7D39EB] font-medium hover:underline"
            >
              {t('register')}
            </Link>
          </p>
        </div>
    </AuthShell>
  );
}
