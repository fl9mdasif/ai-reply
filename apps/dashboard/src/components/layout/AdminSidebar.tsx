'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  BarChart2,
  Ticket,
  Activity,
} from 'lucide-react';
import { clsx } from 'clsx';

const NAV = [
  { href: 'admin', label: 'Overview', icon: LayoutDashboard },
  { href: 'admin/sellers', label: 'Sellers', icon: Users },
  { href: 'admin/orders', label: 'All Orders', icon: ShoppingBag },
  { href: 'admin/stats', label: 'Stats', icon: BarChart2 },
  { href: 'admin/invite-codes', label: 'Invite Codes', icon: Ticket },
  { href: 'admin/health', label: 'Health', icon: Activity },
];

interface Props {
  locale: string;
  onNavClick?: () => void;
}

export function AdminSidebar({ locale, onNavClick }: Props) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col h-full bg-[#0A0A0A] border-r border-[#1F1F1F]">
      <div className="h-14 flex items-center px-5 border-b border-[#1F1F1F]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#7D39EB] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">J</span>
          </div>
          <span className="font-semibold text-white">Admin</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const fullHref = `/${locale}/${href}`;
          const isActive = href === 'admin'
            ? pathname === fullHref
            : pathname.startsWith(fullHref);
          return (
            <Link
              key={href}
              href={fullHref}
              onClick={onNavClick}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#7D39EB]/20 text-[#C6FF33]'
                  : 'text-[#9CA3AF] hover:bg-white/5 hover:text-white',
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
