'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  MessageCircle,
  Plug,
  Settings,
} from 'lucide-react';
import { clsx } from 'clsx';

const NAV = [
  { href: 'seller', label: 'Overview', icon: LayoutDashboard },
  { href: 'seller/catalog', label: 'Catalog', icon: Package },
  { href: 'seller/orders', label: 'Orders', icon: ShoppingBag },
  { href: 'seller/conversations', label: 'Conversations', icon: MessageCircle },
  { href: 'seller/integrations', label: 'Integrations', icon: Plug },
  { href: 'seller/settings', label: 'Settings', icon: Settings },
];

interface Props {
  locale: string;
  onNavClick?: () => void;
}

export function SellerSidebar({ locale, onNavClick }: Props) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col h-full bg-white border-r border-[#EDE9FE]">
      <div className="h-14 flex items-center px-5 border-b border-[#EDE9FE]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#7D39EB] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">J</span>
          </div>
          <span className="font-semibold text-[#09090B]">jobabai</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const fullHref = `/${locale}/${href}`;
          const isActive = href === 'seller'
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
                  ? 'bg-[#F3F0FF] text-[#7D39EB]'
                  : 'text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#09090B]',
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
