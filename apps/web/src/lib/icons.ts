import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Camera,
  FileSpreadsheet,
  Languages,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  MessageCircle,
  MessageSquareReply,
  PackageCheck,
  Phone,
  ShieldCheck,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

/** Icons referenced by name from messages/*.json (`"icon": "..."`). */
export const ICONS: Record<string, LucideIcon> = {
  BarChart3,
  Camera,
  Languages,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  MessageCircle,
  MessageSquareReply,
  PackageCheck,
  Phone,
  Sheet: FileSpreadsheet,
  ShieldCheck,
  Truck,
  Users,
  Wallet,
};

export function getIcon(name: string): LucideIcon {
  return ICONS[name] ?? MessageCircle;
}
