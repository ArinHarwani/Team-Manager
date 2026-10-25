import { useState } from 'react';
import { useRealtimeCustomers } from '@/hooks/useRealtimeCustomers';
import { OutcomeModal } from './OutcomeModal';
import { Clock, CheckCircle2, Users, TrendingUp, MessageSquare } from 'lucide-react';

function getStatusStyle(status: string) {
  switch (status) {
    case 'waiting':      return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'attending':    return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'completed':    return 'bg-slate-100 text-slate-600 border-slate-300';
    case 'sale_success': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    case 'sale_failed':  return 'bg-red-100 text-red-700 border-red-300';
    default:             return 'bg-slate-100 text-slate-600 border-slate-300';
  }
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    waiting: '⏳ Waiting', attending: '🤝 Attending', completed: '✓ Done',
    sale_success: '✅ Sold', sale_failed: '❌ No Sale',
  };
  return labels[status] || status;
}

export function CustomerLogPanel() {
  const { data: customers = [] } = useRealtimeCustomers();
  const [outcomeCustomer, setOutcomeCustomer] = useState<any | null>(null);

  const active = (customers as any[]).filter(c => ['waiting', 'attending'].includes(c.status));
  const completed = (customers as any[]).filter(c =>
    ['completed', 'sale_success', 'sale_failed'].includes(c.status)
  );

  const renderRow = (c: any, isActive: boolean) => {
    const teamName = c.daily_teams?.name || (c.daily_teams ? `Team ${c.daily_teams.team_number}` : '—');
    const groupName = c.daily_teams?.team_groups?.name || c.team_groups?.name;
    const groupColor = c.daily_teams?.team_groups?.color || c.team_groups?.color;

    return (
      <div
        key={c.id}
        className="border rounded-xl overflow-hidden mb-2 bg-white shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="px-4 py-3 flex items-center gap-3">
          {/* Group color bar */}
          {groupColor && (
            <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: groupColor }} />
          )}

          {/* Code */}
          <div className="flex-shrink-0 w-14">
            <span className="font-black text-lg tracking-widest text-slate-800">{c.code}</span>
          </div>

          {/* Group + Team */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              {groupName && (
                <span className="text-xs font-semibold text-slate-400">{groupName} ›</span>
              )}
              <span className="text-xs font-bold text-slate-700">{teamName}</span>
            </div>
            {c.notes && <p className="text-[11px] text-slate-400 truncate mt-0.5">{c.notes}</p>}
            {/* Outcome reason for failed */}
            {c.outcome_reason && (
              <p className="text-[11px] text-red-400 truncate mt-0.5 flex items-center gap-1">
                <MessageSquare className="w-2.5 h-2.5" />
                {c.outcome_reason}
              </p>
            )}
          </div>

          {/* Status */}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${getStatusStyle(c.status)}`}>
            {getStatusLabel(c.status)}
          </span>

          {/* Time */}
          <span className="text-[11px] text-slate-300 hidden sm:block flex-shrink-0">
            {new Date(c.assigned_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>

          {/* Close button — only for active */}
          {isActive && (
            <button
              onClick={() => setOutcomeCustomer(c)}
              className="flex-shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-all hover:scale-105"
            >
              Close ▶
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-amber-700">{active.length}</p>
            <p className="text-xs text-amber-600 font-medium flex items-center justify-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" /> Active
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-emerald-700">
              {(customers as any[]).filter(c => c.status === 'sale_success').length}
            </p>
            <p className="text-xs text-emerald-600 font-medium flex items-center justify-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Sold
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-slate-700">{(customers as any[]).length}</p>
            <p className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1 mt-0.5">
              <Users className="w-3 h-3" /> Total
            </p>
          </div>
        </div>

        {/* Active customers */}
        {active.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Active — click "Close ▶" to mark outcome
            </h4>
            {active.map(c => renderRow(c, true))}
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Completed ({completed.length})
            </h4>
            <div className="max-h-64 overflow-y-auto pr-1">
              {completed.map(c => renderRow(c, false))}
            </div>
          </div>
        )}

        {(customers as any[]).length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No customers today yet</p>
          </div>
        )}
      </div>

      {outcomeCustomer && (
        <OutcomeModal
          customer={outcomeCustomer}
          onClose={() => setOutcomeCustomer(null)}
        />
      )}
    </>
  );
}
