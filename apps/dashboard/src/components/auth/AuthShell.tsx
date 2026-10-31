'use client';

import { ArrowLeft, Check, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002';

type Stat = { value: string; label: string };

type AuthShellProps = {
  locale: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

/** Split layout for login/register: product story on the left, the form on the right. */
export function AuthShell({ locale, title, subtitle, children }: AuthShellProps) {
  const t = useTranslations('auth');
  const features = t.raw('panelFeatures') as string[];
  const stats = t.raw('panelStats') as Stat[];

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="relative hidden overflow-hidden bg-[#1B1033] px-12 py-12 text-white lg:flex lg:flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_28rem_at_10%_0%,rgba(125,57,235,0.55),transparent)]"
        />
        <div className="relative flex flex-1 flex-col">
          <Brand inverted />

          <div className="my-auto max-w-md py-12">
            <p className="text-sm font-medium text-[#C9B5F7]">{t('panelEyebrow')}</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight [text-wrap:balance]">{t('panelTitle')}</h2>
            <p className="mt-4 leading-relaxed text-white/75">{t('panelBody')}</p>

            <ul className="mt-8 space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#7D39EB]">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="text-white/90">{feature}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-10 grid grid-cols-3 gap-3">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-xs text-white/60">{s.label}</dt>
                  <dd className="mt-1 text-xl font-bold">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="text-sm text-white/50">{t('panelFooter')}</p>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col px-4 py-8 sm:px-8">
        <div className="flex items-center justify-between">
          <span className="lg:invisible">
            <Brand />
          </span>
          <a
            href={`${SITE_URL}/${locale}`}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-[#6B7280] transition-colors hover:text-[#09090B]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t('backHome')}
          </a>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-bold text-[#09090B] sm:text-3xl">{title}</h1>
          <p className="mt-2 text-[#6B7280]">{subtitle}</p>
          <div className="mt-8">{children}</div>

          <ul className="mt-10 space-y-2 border-t border-[#EDE9FE] pt-6 lg:hidden">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-[#4B5563]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#7D39EB]" aria-hidden />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${inverted ? 'bg-white text-[#7D39EB]' : 'bg-[#7D39EB] text-white'}`}
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
      </span>
      <span className={`text-lg font-semibold ${inverted ? 'text-white' : 'text-[#09090B]'}`}>jobabai</span>
    </span>
  );
}
