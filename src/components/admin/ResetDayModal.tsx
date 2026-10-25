import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRealtimeGroups } from '@/hooks/useRealtimeGroups';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Trash2, RotateCcw, X, CheckCircle2 } from 'lucide-react';

interface ResetDayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResetDayModal({ isOpen, onClose }: ResetDayModalProps) {
  const queryClient = useQueryClient();
  const today = new Date().toLocaleDateString('en-CA');
  const { data: groups = [] } = useRealtimeGroups();

  const [step, setStep] = useState<'confirm' | 'done'>('confirm');
  const [resetting, setResetting] = useState(false);
  const [keepTeams, setKeepTeams] = useState(true);

  if (!isOpen) return null;

  const handleReset = async () => {
    setResetting(true);
    try {
      // 1. Delete all today's customers
      await supabase.from('customers').delete().eq('date', today);

      // 2. Reset all group allocation pointers for today
      const groupIds = (groups as any[]).map((g: any) => g.id);
      if (groupIds.length > 0) {
        await supabase
          .from('group_allocation_state')
          .update({ next_team_index: 0, updated_at: new Date().toISOString() })
          .eq('date', today);
      }

      // 3. Delete help requests from today
      const todayStart = new Date(today + 'T00:00:00').toISOString();
      await supabase.from('help_requests').delete().gte('created_at', todayStart);

      // 4. Optionally remove team members (daily roster reset)
      if (!keepTeams) {
        await supabase.from('team_members').delete().in(
          'team_id',
          (await supabase
            .from('daily_teams')
            .select('id')
            .eq('date', today)
            .then(r => (r.data || []).map((t: any) => t.id)))
        );
        await supabase.from('daily_teams').delete().eq('date', today);
      }

      // Invalidate all queries
      queryClient.invalidateQueries();
      setStep('done');
    } catch (err: any) {
      alert('Reset failed: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  const handleClose = () => {
    setStep('confirm');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">

        {step === 'done' ? (
          /* ── SUCCESS STATE ── */
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">Day Reset Complete!</h2>
            <p className="text-slate-500 text-sm">
              All customer records cleared, allocation queues reset to Team 1 for each group.
              {!keepTeams && ' Teams have also been cleared for a fresh setup.'}
            </p>
            <button
              onClick={handleClose}
              className="w-full py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors"
            >
              Start Fresh Day ✓
            </button>
          </div>
        ) : (
          /* ── CONFIRM STATE ── */
          <>
            {/* Header */}
            <div className="bg-red-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-extrabold text-lg leading-none">Reset Day</h2>
                  <p className="text-red-200 text-xs mt-0.5">End of day data clear</p>
                </div>
              </div>
              <button onClick={handleClose} className="text-red-200 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Warning box */}
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700 space-y-1">
                  <p className="font-bold">This will permanently delete:</p>
                  <ul className="list-disc ml-4 text-red-600 space-y-0.5 text-xs">
                    <li>All customer records for today</li>
                    <li>All help alerts from today</li>
                    <li>Reset all group round-robin queues to Team 1</li>
                  </ul>
                </div>
              </div>

              {/* Toggle: keep or clear teams */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      checked={keepTeams}
                      onChange={e => setKeepTeams(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-10 h-6 rounded-full transition-colors ${keepTeams ? 'bg-primary' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-1 transition-transform ${keepTeams ? 'translate-x-5' : 'translate-x-1'}`} />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">Keep today's teams & groups</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {keepTeams
                        ? 'Teams, groups & staff assignments stay — only customers + queues reset'
                        : 'Everything cleared — teams, groups, and customers all removed'}
                    </p>
                  </div>
                </label>
              </div>

              <p className="text-xs text-slate-400 text-center">
                📅 Resetting data for <strong>{new Date(today).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
              </p>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex-[2] py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {resetting ? (
                  <><RotateCcw className="w-4 h-4 animate-spin" /> Resetting...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Reset Today's Data</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
