'use client';

import { useState } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Topbar } from '@/components/layout/Topbar';

export default function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0F0F0F]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-30 w-60 flex-shrink-0 transition-transform duration-200',
          'lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <AdminSidebar locale={params.locale} onNavClick={() => setSidebarOpen(false)} />
      </aside>

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <div className="border-b border-[#1F1F1F] bg-[#0A0A0A]">
          <Topbar onMenuClick={() => setSidebarOpen((v) => !v)} />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 text-white">{children}</main>
      </div>
    </div>
  );
}
