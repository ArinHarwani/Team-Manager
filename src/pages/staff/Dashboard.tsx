import { useState, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRealtimeGroups } from '@/hooks/useRealtimeGroups';
import { useRealtimeTeams } from '@/hooks/useRealtimeTeams';
import { useRealtimeCustomers } from '@/hooks/useRealtimeCustomers';
import { useGroupAllocationState } from '@/hooks/useRealtimeAllocation';
import { useRealtimeHelpAlerts } from '@/hooks/useRealtimeHelpAlerts';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, History, Bell, LogOut } from 'lucide-react';
import { format } from 'date-fns';

type Tab = 'teams' | 'history' | 'help';

function getStatusStyle(status: string) {
  switch (status) {
    case 'waiting':      return 'bg-amber-100 text-amber-700';
    case 'attending':    return 'bg-blue-100 text-blue-700';
    case 'sale_success': return 'bg-emerald-100 text-emerald-700';
    case 'sale_failed':  return 'bg-red-100 text-red-700';
    case 'completed':    return 'bg-slate-100 text-slate-600';
    default:             return 'bg-slate-100 text-slate-600';
  }
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    waiting: '⏳ Waiting', attending: '🤝 Attending',
    sale_success: '✅ Sold', sale_failed: '❌ Failed', completed: '✓ Done'
  };
  return labels[status] || status;
}

export default function StaffDashboard() {
  const queryClient = useQueryClient();
  const { profile, signOut } = useAuthStore();
  const today = new Date().toLocaleDateString('en-CA');
  const [activeTab, setActiveTab] = useState<Tab>('teams');
  const [helpMessage, setHelpMessage] = useState('');
  const [helpSent, setHelpSent] = useState(false);
  const [helpSending, setHelpSending] = useState(false);

  const { data: groups = [] } = useRealtimeGroups();
  const { data: teams = [] } = useRealtimeTeams();
  const { data: customers = [] } = useRealtimeCustomers();
  const { data: allocationStates = [] } = useGroupAllocationState();
  const { data: helpAlerts = [] } = useRealtimeHelpAlerts();

  // My own team
  const myTeam = useMemo(() =>
    (teams as any[]).find((t: any) =>
      t.team_members?.some((m: any) => m.staff_id === profile?.id)
    ),
    [teams, profile]
  );

  // Grouped structure
  const groupedTeams = useMemo(() => {
    const map: Record<string, any[]> = {};
    (teams as any[]).forEach((t: any) => {
      const key = t.group_id || '__none__';
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [teams]);

  const getActiveCustomers = (teamId: string) =>
    (customers as any[]).filter((c: any) =>
      c.team_id === teamId && ['waiting', 'attending'].includes(c.status)
    );

  const getNextInGroup = (groupId: string, groupTeams: any[]) => {
    const state = (allocationStates as any[]).find?.((s: any) => s.group_id === groupId);
    const idx = (state?.next_team_index ?? 0) % Math.max(groupTeams.length, 1);
    return groupTeams[idx];
  };

  // History: all customers today
  const allCustomersToday = useMemo(() =>
    (customers as any[]).sort((a, b) =>
      new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
    ),
    [customers]
  );

  // Send help
  const handleSendHelp = async () => {
    if (!helpMessage.trim()) return;
    setHelpSending(true);
    try {
      await supabase.from('help_requests').insert([{
        staff_id: profile?.id,
        team_id: myTeam?.id || null,
        message: helpMessage.trim(),
      }]);
      setHelpSent(true);
      setHelpMessage('');
      setTimeout(() => setHelpSent(false), 4000);
      queryClient.invalidateQueries({ queryKey: ['help_requests', today] });
    } catch (err) {
      console.error(err);
    } finally {
      setHelpSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div>
          <p className="font-black text-slate-800 text-lg leading-none">
            {profile?.name || 'Staff'}
          </p>
          {myTeam ? (
            <p className="text-xs text-slate-500 mt-0.5">
              📌 <span className="font-semibold text-primary">{myTeam.name}</span>
              {myTeam.team_groups && <span className="text-slate-400"> · {myTeam.team_groups.name}</span>}
            </p>
          ) : (
            <p className="text-xs text-amber-600 mt-0.5">⚠ Not assigned to a team</p>
          )}
        </div>
        <button
          onClick={signOut}
          className="text-slate-400 hover:text-red-500 transition-colors p-2"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Date banner */}
      <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 px-4 py-2 text-center text-xs font-semibold text-slate-600 border-b">
        📅 {format(new Date(), 'EEEE, MMMM d, yyyy')}
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b px-4 flex gap-1 sticky top-[57px] z-30">
        {([
          { id: 'teams',   label: 'All Teams',    icon: LayoutGrid },
          { id: 'history', label: 'Today\'s Log', icon: History },
          { id: 'help',    label: 'Send Help',    icon: Bell },
        ] as { id: Tab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 pb-24 space-y-4">

        {/* ── TEAMS TAB ── */}
        {activeTab === 'teams' && (
          <div className="space-y-5">
            {(groups as any[]).map((group: any) => {
              const groupTeams = (groupedTeams[group.id] || []).sort(
                (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.team_number - b.team_number
              );
              if (groupTeams.length === 0) return null;
              const nextTeam = getNextInGroup(group.id, groupTeams);

              return (
                <div key={group.id} className="space-y-2">
                  {/* Group label */}
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                    <span className="font-extrabold text-slate-800 text-sm">{group.name}</span>
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[10px] font-bold text-slate-400">{groupTeams.length} teams</span>
                  </div>

                  {/* Next team indicator */}
                  <div className="rounded-xl px-3 py-2 text-xs font-bold border flex items-center gap-2"
                    style={{ backgroundColor: group.color + '18', borderColor: group.color + '44', color: group.color }}
                  >
                    ▶ Next in queue: <span className="font-black text-sm">{nextTeam?.name || `Team ${nextTeam?.team_number}`}</span>
                  </div>

                  {/* Team cards */}
                  {groupTeams.map((team: any) => {
                    const activeCustomers = getActiveCustomers(team.id);
                    const isBusy = activeCustomers.length > 0;
                    const isNext = team.id === nextTeam?.id;
                    const isMyTeam = team.id === myTeam?.id;
                    const members = team.team_members || [];

                    return (
                      <div
                        key={team.id}
                        className={`rounded-xl border-2 overflow-hidden ${
                          isMyTeam ? 'ring-2 ring-primary ring-offset-1' : ''
                        }`}
                        style={{
                          borderColor: isNext ? group.color : isBusy ? '#fcd34d' : '#e2e8f0',
                          backgroundColor: isNext ? group.color + '08' : 'white'
                        }}
                      >
                        <div className="px-3 py-2 flex items-center justify-between border-b bg-slate-50/50">
                          <div className="flex items-center gap-2">
                            {isNext && (
                              <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: group.color }}>
                                NEXT
                              </span>
                            )}
                            {isMyTeam && (
                              <span className="text-[10px] font-black bg-primary text-white px-2 py-0.5 rounded-full">MY TEAM</span>
                            )}
                            <span className="font-bold text-sm text-slate-800">{team.name}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isBusy ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {isBusy ? `⚡ ${activeCustomers.length} Active` : '✓ Free'}
                          </span>
                        </div>

                        <div className="p-3 space-y-2">
                          {/* Staff */}
                          {members.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {members.map((m: any) => (
                                <span key={m.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                  {m.profiles?.name?.split(' ')[0] || '?'}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Customers */}
                          {activeCustomers.length > 0 && (
                            <div className="space-y-1">
                              {activeCustomers.map((c: any) => (
                                <div key={c.id} className="flex items-center justify-between px-2 py-1 bg-white border rounded-lg">
                                  <span className="font-black text-sm tracking-widest">{c.code}</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusStyle(c.status)}`}>
                                    {getStatusLabel(c.status)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {activeCustomers.length === 0 && (
                            <p className="text-xs text-slate-400 italic">No active customers</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {(teams as any[]).length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <p className="font-medium">No teams configured yet.</p>
                <p className="text-sm mt-1 text-slate-300">Ask your admin to set up teams.</p>
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Today's Customer Log</h3>
              <span className="text-xs text-slate-400">{allCustomersToday.length} total</span>
            </div>

            {allCustomersToday.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="font-medium">No customers today yet</p>
              </div>
            ) : (
              allCustomersToday.map((c: any) => {
                const teamName = c.daily_teams?.name || (c.daily_teams ? `Team ${c.daily_teams.team_number}` : '—');
                const groupColor = c.daily_teams?.team_groups?.color || c.team_groups?.color;
                const groupName = c.daily_teams?.team_groups?.name || c.team_groups?.name;
                return (
                  <div key={c.id} className="bg-white border rounded-xl px-3 py-2.5 flex items-center gap-3 shadow-sm">
                    <div className="flex-shrink-0">
                      {groupColor && <div className="w-2 h-8 rounded-full" style={{ backgroundColor: groupColor }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base tracking-widest text-slate-800">{c.code}</span>
                        {c.is_override && (
                          <span className="text-[9px] font-bold bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">OVERRIDE</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {groupName && <span>{groupName} › </span>}{teamName}
                        {c.notes && <span className="ml-2 italic">{c.notes}</span>}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusStyle(c.status)}`}>
                        {getStatusLabel(c.status)}
                      </span>
                      <p className="text-[10px] text-slate-300 mt-0.5">
                        {new Date(c.assigned_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── HELP TAB ── */}
        {activeTab === 'help' && (
          <div className="space-y-4">
            {helpSent && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-in fade-in">
                ✅ Help request sent to admin!
              </div>
            )}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-500" /> Request Help
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Send a help notification to admin. Only admin can see this alert.
                </p>
              </div>
              <textarea
                className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary h-24 placeholder-slate-300"
                placeholder="Describe what you need help with..."
                value={helpMessage}
                onChange={e => setHelpMessage(e.target.value)}
              />
              <button
                onClick={handleSendHelp}
                disabled={!helpMessage.trim() || helpSending}
                className="w-full h-12 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <Bell className="w-5 h-5" />
                {helpSending ? 'Sending...' : 'Send Help Request'}
              </button>
            </div>

            {/* My recent help requests */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">My Recent Requests</h4>
              {(helpAlerts as any[])
                .filter((h: any) => h.staff_id === profile?.id)
                .slice(0, 5)
                .map((h: any) => (
                  <div key={h.id} className="bg-white border rounded-xl px-3 py-2 flex items-center justify-between text-sm">
                    <span className="text-slate-700 truncate">{h.message || 'Help request'}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                      h.resolved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {h.resolved ? '✓ Resolved' : '⏳ Pending'}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
