import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StaffStatus = 'free' | 'busy' | 'supporting' | 'on_break' | 'offline';

interface StatusChipProps {
  status: StaffStatus;
  className?: string;
}

const statusConfig: Record<StaffStatus, { label: string; className: string }> = {
  free: { label: 'Free', className: 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-500/20' },
  busy: { label: 'Busy', className: 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 border-amber-500/20' },
  supporting: { label: 'Supporting', className: 'bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 border-blue-500/20' },
  on_break: { label: 'On Break', className: 'bg-purple-500/15 text-purple-700 hover:bg-purple-500/25 border-purple-500/20' },
  offline: { label: 'Offline', className: 'bg-slate-500/15 text-slate-700 hover:bg-slate-500/25 border-slate-500/20' },
};

export function StatusChip({ status, className }: StatusChipProps) {
  const config = statusConfig[status] || statusConfig['offline'];
  
  return (
    <Badge 
      variant="outline" 
      className={cn("font-medium transition-colors", config.className, className)}
    >
      <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", config.className.split(' ')[1].replace('text-', 'bg-'))} />
      {config.label}
    </Badge>
  );
}
