import { cn } from '@/lib/cn';

type BadgeVariant = 'confirmed' | 'pending' | 'cancelled' | 'risk' | 'synced' | 'failed' | 'default';

const variantStyles: Record<BadgeVariant, string> = {
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
  risk: 'bg-red-50 text-red-700 border-red-200',
  synced: 'bg-violet-50 text-violet-700 border-violet-200',
  failed: 'bg-red-50 text-red-600 border-red-200',
  default: 'bg-gray-100 text-gray-600 border-gray-200',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
