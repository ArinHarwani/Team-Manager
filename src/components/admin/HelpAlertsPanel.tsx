import { supabase } from '@/lib/supabase';
import { useRealtimeHelpAlerts } from '@/hooks/useRealtimeHelpAlerts';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2, AlertTriangle } from 'lucide-react';

export function HelpAlertsPanel() {
  const queryClient = useQueryClient();
  const today = new Date().toLocaleDateString('en-CA');
  const { data: helpAlerts = [], isLoading } = useRealtimeHelpAlerts();

  const pending = (helpAlerts as any[]).filter((h: any) => !h.resolved);
  const resolved = (helpAlerts as any[]).filter((h: any) => h.resolved);

  const handleResolve = async (id: string) => {
    await supabase
      .from('help_requests')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['help_requests', today] });
  };

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pending alerts */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-amber-500" />
          Pending Alerts ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <div className="text-center py-8 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-60" />
            <p className="font-semibold text-sm">All clear! No pending help requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((h: any) => (
              <div
                key={h.id}
                className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">
                        {h.profiles?.name || 'Staff member'}
                        {h.daily_teams && (
                          <span className="font-normal text-slate-500"> · {h.daily_teams.name}</span>
                        )}
                      </p>
                      {h.message && (
                        <p className="text-sm text-slate-600 mt-1">{h.message}</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1">
                        {new Date(h.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleResolve(h.id)}
                    className="flex-shrink-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-emerald-600 transition-colors flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolved alerts */}
      {resolved.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Resolved ({resolved.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {resolved.map((h: any) => (
              <div key={h.id} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between text-sm opacity-60">
                <div>
                  <span className="font-semibold text-slate-700">{h.profiles?.name || 'Staff'}</span>
                  {h.message && <span className="text-slate-500 ml-2 text-xs">— {h.message}</span>}
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Resolved</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
