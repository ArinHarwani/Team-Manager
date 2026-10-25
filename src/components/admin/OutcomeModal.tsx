import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle2, XCircle, MessageSquare } from 'lucide-react';

interface OutcomeModalProps {
  customer: {
    id: string;
    code: string;
    team_id: string;
    daily_teams?: { name?: string; team_number?: number; team_groups?: { color?: string } };
  };
  onClose: () => void;
}

const FAIL_REASONS = [
  'Price too high',
  'Not the right fit',
  'Just browsing',
  'Out of stock',
  'Came back later',
  'Competitor',
];

export function OutcomeModal({ customer, onClose }: OutcomeModalProps) {
  const queryClient = useQueryClient();
  const today = new Date().toLocaleDateString('en-CA');

  const [step, setStep] = useState<'pick' | 'fail-reason'>('pick');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const teamName = customer.daily_teams?.name ||
    (customer.daily_teams?.team_number ? `Team ${customer.daily_teams.team_number}` : 'Team');
  const groupColor = customer.daily_teams?.team_groups?.color || '#6366f1';

  const close = () => { onClose(); };

  const markOutcome = async (status: 'sale_success' | 'sale_failed', outcomeReason?: string) => {
    setSubmitting(true);
    try {
      await supabase
        .from('customers')
        .update({
          status,
          completed_at: new Date().toISOString(),
          outcome_reason: outcomeReason || null,
        })
        .eq('id', customer.id);

      queryClient.invalidateQueries({ queryKey: ['customers', today] });
      close();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ backgroundColor: groupColor + '15' }}>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Close Customer</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-black text-2xl tracking-widest text-slate-900">{customer.code}</span>
              <span className="text-sm text-slate-500">→ {teamName}</span>
            </div>
          </div>
          <button onClick={close} className="text-slate-300 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Pick outcome */}
        {step === 'pick' && (
          <div className="p-5 space-y-3">
            <p className="text-sm font-semibold text-slate-600 text-center mb-4">
              How did it go?
            </p>

            {/* Success button */}
            <button
              onClick={() => markOutcome('sale_success')}
              disabled={submitting}
              className="w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400 transition-all group disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-extrabold text-emerald-800 text-base">Sale! ✅</p>
                  <p className="text-xs text-emerald-600">Customer bought — team goes free</p>
                </div>
              </div>
              <span className="text-emerald-400 group-hover:translate-x-1 transition-transform text-xl">→</span>
            </button>

            {/* Fail button */}
            <button
              onClick={() => setStep('fail-reason')}
              disabled={submitting}
              className="w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 border-red-100 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all group disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-400 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-extrabold text-red-800 text-base">No Sale ❌</p>
                  <p className="text-xs text-red-500">Add optional reason — team goes free</p>
                </div>
              </div>
              <span className="text-red-300 group-hover:translate-x-1 transition-transform text-xl">→</span>
            </button>
          </div>
        )}

        {/* Step 2: Fail reason */}
        {step === 'fail-reason' && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-5 h-5 text-red-400" />
              <p className="font-bold text-slate-700">Reason for no sale</p>
              <span className="text-xs text-slate-400 ml-1">(optional)</span>
            </div>

            {/* Quick reason chips */}
            <div className="flex flex-wrap gap-2">
              {FAIL_REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(prev => prev === r ? '' : r)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border-2 transition-all ${
                    reason === r
                      ? 'border-red-400 bg-red-500 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-red-200 hover:bg-red-50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Custom reason */}
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Or type a custom reason..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setStep('pick')}
                className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => markOutcome('sale_failed', reason || undefined)}
                disabled={submitting}
                className="flex-2 flex-grow-[2] py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span className="animate-pulse">Saving...</span>
                ) : (
                  <><XCircle className="w-4 h-4" /> Confirm No Sale &amp; Free Team</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer note */}
        <div className="px-5 pb-4 text-center">
          <p className="text-[11px] text-slate-300">
            Closing this customer will mark the team as <strong>Free</strong> for new customers.
          </p>
        </div>
      </div>
    </div>
  );
}
