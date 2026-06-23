import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type CustomerStatus = 'waiting' | 'attending' | 'completed' | 'sale_success' | 'sale_failed';

interface CustomerBadgeProps {
  code: string;
  status: CustomerStatus;
  className?: string;
}

const statusConfig: Record<CustomerStatus, string> = {
  waiting: 'bg-slate-100 text-slate-700 border-slate-200',
  attending: 'bg-amber-100 text-amber-800 border-amber-200',
  completed: 'bg-blue-100 text-blue-800 border-blue-200',
  sale_success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  sale_failed: 'bg-rose-100 text-rose-800 border-rose-200',
};

export function CustomerBadge({ code, status, className }: CustomerBadgeProps) {
  const bgClass = statusConfig[status] || statusConfig['waiting'];
  
  return (
    <Badge 
      variant="outline" 
      className={cn("text-xs font-bold px-2 py-0.5 tracking-wider uppercase shadow-sm", bgClass, className)}
    >
      {code}
    </Badge>
  );
}
