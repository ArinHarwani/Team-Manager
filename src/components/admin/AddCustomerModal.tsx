import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRealtimeGroups } from '@/hooks/useRealtimeGroups';
import { useRealtimeTeams } from '@/hooks/useRealtimeTeams';
import { useRealtimeCustomers } from '@/hooks/useRealtimeCustomers';
import { useGroupAllocationState } from '@/hooks/useRealtimeAllocation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Users, AlertCircle, CheckCircle2, ArrowRight, RefreshCw, Tag } from 'lucide-react';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_CODES = ['G', '1G', '2G', 'HW', 'FAM', 'GRP', 'VIP', 'RET', 'BOY', 'MIX'];

export function AddCustomerModal({ isOpen, onClose }: AddCustomerModalProps) {
  const queryClient = useQueryClient();
  const today = new Date().toLocaleDateString('en-CA');

  const [step, setStep] = useState<'group' | 'team'>('group');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [code, setCode] = useState('');
  const [notes, setNotes] = useState('');
  const [overrideTeamId, setOverrideTeamId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: groups = [] } = useRealtimeGroups();
  const { data: allTeams = [] } = useRealtimeTeams();
  const { data: allocationStates = [] } = useGroupAllocationState();
  const { data: customers = [] } = useRealtimeCustomers();

  const selectedGroup = groups.find((g: any) => g.id === selectedGroupId);
  const groupTeams = useMemo(() =>
    (allTeams as any[]).filter((t: any) => t.group_id === selectedGroupId)
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.team_number - b.team_number),
    [allTeams, selectedGroupId]
  );

  // Determine recommended team for the selected group
  const recommendedTeamIndex = useMemo(() => {
    if (!selectedGroupId || groupTeams.length === 0) return 0;
    const state = (allocationStates as any[]).find?.((s: any) => s.group_id === selectedGroupId);
    const idx = state?.next_team_index ?? 0;
    return idx % groupTeams.length;
  }, [selectedGroupId, groupTeams, allocationStates]);

  const recommendedTeam = groupTeams[recommendedTeamIndex];

  // Determine if a team is "busy" (has active/waiting customers today)
  const busyTeamIds = useMemo(() => {
    const busy = new Set<string>();
    (customers as any[]).forEach((c: any) => {
      if (c.team_id && ['waiting', 'attending'].includes(c.status)) {
        busy.add(c.team_id);
      }
    });
    return busy;
  }, [customers]);

  const targetTeam = overrideTeamId
    ? groupTeams.find((t: any) => t.id === overrideTeamId)
    : recommendedTeam;

  if (!isOpen) return null;

  const handleReset = () => {
    setStep('group');
    setSelectedGroupId('');
    setCode('');
    setNotes('');
    setOverrideTeamId('');
    setError(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleGroupSelect = (groupId: string) => {
    setSelectedGroupId(groupId);
    setOverrideTeamId('');
    setStep('team');
  };

  const handleAssign = async () => {
    if (!code.trim()) {
      setError('Please enter a customer code');
      return;
    }
    if (!targetTeam) {
      setError('No team selected. Please pick a group and confirm a team.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const isOverride = overrideTeamId !== '';

      // 1. Insert customer
      const { error: insertError } = await supabase
        .from('customers')
        .insert([{
          code: code.trim().toUpperCase(),
          notes: notes.trim() || null,
          team_id: targetTeam.id,
          group_id: selectedGroupId,
          date: today,
          assigned_at: new Date().toISOString(),
          is_override: isOverride,
          status: 'waiting',
        }]);
      if (insertError) throw insertError;

      // 2. Advance the allocation pointer for this group ONLY if NOT overriding
      if (!isOverride) {
        const newIndex = (recommendedTeamIndex + 1) % groupTeams.length;
        await supabase
          .from('group_allocation_state')
          .upsert(
            { group_id: selectedGroupId, date: today, next_team_index: newIndex, updated_at: new Date().toISOString() },
            { onConflict: 'group_id,date' }
          );
      }

      queryClient.invalidateQueries({ queryKey: ['customers', today] });
      queryClient.invalidateQueries({ queryKey: ['group_allocation_state'] });
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-slate-800 to-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">New Customer</h2>
              <p className="text-slate-300 text-xs">
                {step === 'group' ? 'Step 1: Select category group' : 'Step 2: Confirm team & enter code'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-center text-sm gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Step 1: Group selection */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
              Category Group
            </label>
            {groups.length === 0 ? (
              <div className="text-center p-6 bg-amber-50 rounded-xl border border-amber-200 text-amber-700 text-sm">
                No groups created yet. Go to <strong>Teams</strong> to create groups first.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(groups as any[]).map((g: any) => (
                  <button
                    key={g.id}
                    onClick={() => handleGroupSelect(g.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                      selectedGroupId === g.id
                        ? 'border-transparent shadow-lg'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    style={selectedGroupId === g.id ? { backgroundColor: g.color + '22', borderColor: g.color } : {}}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                      <span className="font-bold text-slate-800 text-sm">{g.name}</span>
                    </div>
                    {g.description && (
                      <p className="text-xs text-slate-500 mt-1 ml-5">{g.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Team recommendation + code */}
          {step === 'team' && selectedGroup && (
            <>
              {/* Recommended Team Banner */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Recommended Team
                </label>
                {groupTeams.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
                    No teams in <strong>{selectedGroup.name}</strong> group yet.
                  </div>
                ) : (
                  <>
                    <div
                      className="p-4 rounded-xl border-2 flex items-center justify-between mb-3"
                      style={{ borderColor: selectedGroup.color, backgroundColor: selectedGroup.color + '11' }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4" style={{ color: selectedGroup.color }} />
                          <span className="font-bold text-slate-800">
                            {targetTeam?.name || `Team ${targetTeam?.team_number}`}
                          </span>
                          {busyTeamIds.has(targetTeam?.id) && (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">BUSY</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 ml-6">
                          {overrideTeamId ? '⚡ Override selected' : '📋 Round-robin recommendation'}
                        </p>
                      </div>
                      {overrideTeamId && (
                        <button
                          onClick={() => setOverrideTeamId('')}
                          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Reset
                        </button>
                      )}
                    </div>

                    {/* Override selector */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Override to a different team (optional):
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {groupTeams.map((t: any) => {
                          const isBusy = busyTeamIds.has(t.id);
                          const isRecommended = t.id === recommendedTeam?.id;
                          const isSelected = overrideTeamId === t.id;
                          return (
                            <button
                              key={t.id}
                              onClick={() => setOverrideTeamId(isSelected ? '' : t.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                                isSelected
                                  ? 'text-white border-transparent'
                                  : isBusy
                                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                              }`}
                              style={isSelected ? { backgroundColor: selectedGroup.color, borderColor: selectedGroup.color } : {}}
                            >
                              {t.name || `T${t.team_number}`}
                              {isRecommended && !isSelected && <span className="ml-1 opacity-60">★</span>}
                              {isBusy && !isSelected && <span className="ml-1">⚡</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Customer Code */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Customer Code
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="e.g. G, HW, FAM, VIP"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    className="pl-9 text-lg font-bold uppercase tracking-widest h-12"
                    maxLength={12}
                    autoFocus
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {COMMON_CODES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCode(c)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all hover:scale-105 ${
                        code === c
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Notes (Optional)
                </label>
                <Input
                  placeholder="Special requirements, details..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="h-10"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t bg-slate-50 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={handleClose} className="font-medium">
            Cancel
          </Button>
          {step === 'team' && groupTeams.length > 0 && (
            <Button
              onClick={handleAssign}
              disabled={isSubmitting || !code.trim() || !targetTeam}
              className="font-bold px-6 gap-2"
              style={{ backgroundColor: selectedGroup?.color }}
            >
              {isSubmitting ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Assigning...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Assign to {targetTeam?.name || `Team ${targetTeam?.team_number}`}</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
