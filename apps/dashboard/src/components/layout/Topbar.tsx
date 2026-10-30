'use client';

import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { logout } = useAuth();

  return (
    <header className="h-14 border-b border-[#EDE9FE] bg-white flex items-center justify-between px-4 gap-4">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-lg hover:bg-[#F3F0FF] text-[#6B7280]"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#EF4444] transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
