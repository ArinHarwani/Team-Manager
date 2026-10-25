import { useState, useMemo } from 'react';
import { useRealtimeTeams } from '@/hooks/useRealtimeTeams';
import { useRealtimeCustomers } from '@/hooks/useRealtimeCustomers';
import { useRealtimeGroups } from '@/hooks/useRealtimeGroups';
import { useGroupAllocationState } from '@/hooks/useRealtimeAllocation';
import { useRealtimeStaffStatus } from '@/hooks/useRealtimeStaffStatus';
import { OutcomeModal } from './OutcomeModal';

function getStatusStyle(status: string) {
  switch (status) {
    case 'waiting':      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'attending':    return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'completed':    return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'sale_success': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'sale_failed':  return 'bg-red-100 text-red-700 border-red-200';
    default:             return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'waiting':      return '⏳ Waiting';
    case 'attending':    return '🤝 Attending';
    case 'completed':    return '✓ Done';
    case 'sale_success': return '✅ Sold';
    case 'sale_failed':  return '❌ No Sale';
    default: return status;
  }
}

export function TeamBoard() {
  const { data: groups = [] } = useRealtimeGroups();
  const { data: teams = [] } = useRealtimeTeams();
  const { data: customers = [] } = useRealtimeCustomers();
  const { data: allocationStates = [] } = useGroupAllocationState();
  const { data: staffStatuses = [] } = useRealtimeStaffStatus();

  const [outcomeCustomer, setOutcomeCustomer] = useState<any | null>(null);

  // Build grouped structure
  const groupedTeams = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    const noGroup: any[] = [];
    (teams as any[]).forEach((t: any) => {
      if (t.group_id) {
        if (!grouped[t.group_id]) grouped[t.group_id] = [];
        grouped[t.group_id].push(t);
      } else {
        noGroup.push(t);
      }
    });
    return { grouped, noGroup };
  }, [teams]);

  const getActiveCustomers = (teamId: string) =>
    (customers as any[]).filter((c: any) =>
      c.team_id === teamId && ['waiting', 'attending'].includes(c.status)
    );

  const getNextTeamInGroup = (groupId: string, groupTeams: any[]) => {
    const state = (allocationStates as any[]).find?.((s: any) => s.group_id === groupId);
    const idx = (state?.next_team_index ?? 0) % Math.max(groupTeams.length, 1);
    return groupTeams[idx];
  };

  const renderTeam = (team: any, isNext: boolean, groupColor: string) => {
    const activeCustomers = getActiveCustomers(team.id);
    const isBusy = activeCustomers.length > 0;
    const members = team.team_members || [];

    return (
      <div
        key={team.id}
        className={`rounded-xl border-2 overflow-hidden transition-all ${
          isNext ? 'shadow-lg' : isBusy ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200 bg-white'
        }`}
        style={isNext ? { borderColor: groupColor, backgroundColor: groupColor + '08' } : {}}
      >
        {/* Team Header */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={isNext ? { backgroundColor: groupColor + '20' } : { backgroundColor: '#f8fafc' }}
        >
          <div className="flex items-center gap-2">
            {isNext && (
              <span
                className="text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: groupColor }}
              >
                NEXT ▶
              </span>
            )}
            <span className="font-bold text-sm text-slate-800">
              {team.name || `Team ${team.team_number}`}
            </span>
          </div>
          <div>
            {isBusy ? (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                ⚡ {activeCustomers.length} Active
              </span>
            ) : (
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                ✓ Free
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-3 space-y-2">
          {/* Staff members */}
          {members.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {members.map((m: any) => {
                const statusObj = (staffStatuses as any[]).find((s: any) => s.staff_id === m.staff_id);
                const status = statusObj?.status || 'offline';
                const dot = status === 'available' ? 'bg-emerald-500' : status === 'busy' ? 'bg-amber-500' : 'bg-slate-300';
                return (
                  <div key={m.id} className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full text-xs text-slate-700">
                    <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    <span>{m.profiles?.name?.split(' ')[0] || 'Staff'}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active customers with Close button */}
          {activeCustomers.length > 0 ? (
            <div className="space-y-1.5">
              {activeCustomers.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between bg-white border rounded-xl px-2.5 py-2 group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-black text-sm tracking-wider text-slate-900">{c.code}</span>
                    {c.notes && (
                      <span className="text-[10px] text-slate-400 truncate max-w-[60px]">{c.notes}</span>
                    )}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${getStatusStyle(c.status)}`}>
                      {getStatusLabel(c.status)}
                    </span>
                  </div>

                  {/* Close / Outcome button */}
                  <button
                    onClick={() => setOutcomeCustomer(c)}
                    className="flex-shrink-0 ml-2 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-all hover:scale-105 opacity-70 group-hover:opacity-100"
                    title="Mark outcome and free team"
                  >
                    Close ▶
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-1">No active customers</p>
          )}
        </div>
      </div>
    );
  };

  if ((teams as any[]).length === 0) {
    return (
      <div className="text-center p-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-200 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-600 mb-1">No Teams for Today</h3>
        <p className="text-sm text-slate-400">Go to the Teams tab to create groups and teams.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Groups */}
        {(groups as any[]).map((group: any) => {
          const groupTeams = (groupedTeams.grouped[group.id] || [])
            .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.team_number - b.team_number);
          if (groupTeams.length === 0) return null;
          const nextTeam = getNextTeamInGroup(group.id, groupTeams);

          return (
            <div key={group.id} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                <h3 className="font-extrabold text-base text-slate-800">{group.name}</h3>
                {group.description && (
                  <span className="text-xs text-slate-400">{group.description}</span>
                )}
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-medium text-slate-400">{groupTeams.length} teams</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {groupTeams.map((team: any) =>
                  renderTeam(team, team.id === nextTeam?.id, group.color)
                )}
              </div>
            </div>
          );
        })}

        {/* Ungrouped */}
        {groupedTeams.noGroup.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-slate-400 flex-shrink-0" />
              <h3 className="font-extrabold text-base text-slate-600">Ungrouped Teams</h3>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {groupedTeams.noGroup.map((team: any) =>
                renderTeam(team, false, '#94a3b8')
              )}
            </div>
          </div>
        )}
      </div>

      {/* Outcome modal — rendered at root level so it's above everything */}
      {outcomeCustomer && (
        <OutcomeModal
          customer={outcomeCustomer}
          onClose={() => setOutcomeCustomer(null)}
        />
      )}
    </>
  );
}
