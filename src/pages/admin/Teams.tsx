import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRealtimeTeams } from '@/hooks/useRealtimeTeams';
import { useRealtimeGroups } from '@/hooks/useRealtimeGroups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus, Trash2, UserPlus, UserMinus,
  Sparkles, CheckCircle2, FolderOpen,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

const GROUP_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6',
];

export default function AdminTeams() {
  const queryClient = useQueryClient();
  const today = new Date().toLocaleDateString('en-CA');

  const { data: teams = [], isLoading: teamsLoading } = useRealtimeTeams();
  const { data: groups = [], isLoading: groupsLoading } = useRealtimeGroups();

  const [toast, setToast] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']));

  // -- Group management state --
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
  const [groupFormError, setGroupFormError] = useState<string | null>(null);

  // -- Team management state --
  const [showNewTeam, setShowNewTeam] = useState<string | null>(null); // groupId or 'none'
  const [newTeamName, setNewTeamName] = useState('');
  const [teamFormError, setTeamFormError] = useState<string | null>(null);

  // -- Staff state --
  const [showNewStaff, setShowNewStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [staffFormError, setStaffFormError] = useState<string | null>(null);

  const { data: staffList = [], isLoading: staffLoading } = useQuery({
    queryKey: ['admin_staff_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('role', 'staff').eq('is_active', true).order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ---- GROUPS ----
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupFormError(null);
    const name = newGroupName.trim();
    if (!name) { setGroupFormError('Group name is required'); return; }
    try {
      const sortOrder = (groups as any[]).length;
      const { error } = await supabase.from('team_groups').insert([{
        name, description: newGroupDesc.trim() || null, color: newGroupColor, sort_order: sortOrder, is_active: true
      }]);
      if (error) throw error;
      setNewGroupName(''); setNewGroupDesc(''); setShowNewGroup(false);
      queryClient.invalidateQueries({ queryKey: ['team_groups'] });
      notify(`Group "${name}" created`);
    } catch (err: any) {
      setGroupFormError(err.message);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Delete group "${groupName}"? Teams will become ungrouped.`)) return;
    try {
      // Set group_id to null on teams (don't delete teams)
      await supabase.from('daily_teams').update({ group_id: null }).eq('group_id', groupId);
      await supabase.from('team_groups').update({ is_active: false }).eq('id', groupId);
      queryClient.invalidateQueries({ queryKey: ['team_groups'] });
      queryClient.invalidateQueries({ queryKey: ['daily_teams', today] });
      notify(`Group "${groupName}" removed`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ---- TEAMS ----
  const handleCreateTeam = async (e: React.FormEvent, groupId: string | null) => {
    e.preventDefault();
    setTeamFormError(null);
    const name = newTeamName.trim();
    if (!name) { setTeamFormError('Team name is required'); return; }

    // Auto-number within group or globally
    const existingInGroup = (teams as any[]).filter((t: any) =>
      groupId ? t.group_id === groupId : !t.group_id
    );
    const teamNumber = existingInGroup.length + 1;

    try {
      const { error } = await supabase.from('daily_teams').insert([{
        date: today,
        team_number: teamNumber,
        name,
        group_id: groupId || null,
        sort_order: existingInGroup.length,
      }]);
      if (error) {
        if (error.code === '23505') throw new Error('A team with this number already exists. Refresh and try again.');
        throw error;
      }

      // Ensure allocation state exists for this group
      if (groupId) {
        await supabase.from('group_allocation_state').upsert(
          { group_id: groupId, date: today, next_team_index: 0 },
          { onConflict: 'group_id,date' }
        );
      }

      setNewTeamName(''); setShowNewTeam(null);
      queryClient.invalidateQueries({ queryKey: ['daily_teams', today] });
      notify(`Team "${name}" created`);
    } catch (err: any) {
      setTeamFormError(err.message);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Delete team "${teamName}"?`)) return;
    try {
      await supabase.from('daily_teams').delete().eq('id', teamId);
      queryClient.invalidateQueries({ queryKey: ['daily_teams', today] });
      notify(`Deleted ${teamName}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ---- STAFF ASSIGNMENT ----
  const handleAssignStaff = async (teamId: string, staffId: string) => {
    try {
      // Remove from old team first
      for (const t of (teams as any[])) {
        if (t.team_members?.some((m: any) => m.staff_id === staffId)) {
          await supabase.from('team_members').delete().eq('team_id', t.id).eq('staff_id', staffId);
        }
      }
      await supabase.from('team_members').insert([{ team_id: teamId, staff_id: staffId }]);
      queryClient.invalidateQueries({ queryKey: ['daily_teams', today] });
      notify('Staff assigned');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemoveStaff = async (teamId: string, staffId: string) => {
    try {
      await supabase.from('team_members').delete().eq('team_id', teamId).eq('staff_id', staffId);
      queryClient.invalidateQueries({ queryKey: ['daily_teams', today] });
      notify('Staff removed');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ---- NEW STAFF PROFILE ----
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffFormError(null);
    const name = newStaffName.trim();
    if (!name) { setStaffFormError('Name required'); return; }
    try {
      const { error } = await supabase.from('profiles').insert([{ name, role: 'staff', is_active: true }]);
      if (error) throw error;
      setNewStaffName(''); setShowNewStaff(false);
      queryClient.invalidateQueries({ queryKey: ['admin_staff_profiles'] });
      notify(`Added ${name} to staff`);
    } catch (err: any) {
      setStaffFormError(err.message);
    }
  };

  // ---- Computed helpers ----
  const assignedStaffIds = new Set<string>();
  (teams as any[]).forEach((t: any) => t.team_members?.forEach((m: any) => assignedStaffIds.add(m.staff_id)));
  const getStaffAssignment = (staffId: string) => {
    for (const t of (teams as any[])) {
      if (t.team_members?.some((m: any) => m.staff_id === staffId))
        return { teamId: t.id, teamName: t.name || `Team ${t.team_number}` };
    }
    return null;
  };

  const getGroupTeams = (groupId: string | null) =>
    (teams as any[]).filter((t: any) => groupId ? t.group_id === groupId : !t.group_id)
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.team_number - b.team_number);

  const renderTeamCard = (team: any, groupColor: string) => {
    const members = team.team_members || [];
    const unassigned = (staffList as any[]).filter((s: any) => !members.some((m: any) => m.staff_id === s.id));

    return (
      <div key={team.id} className="bg-white border-2 rounded-xl overflow-hidden shadow-sm" style={{ borderColor: groupColor + '44' }}>
        {/* Team header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ backgroundColor: groupColor + '11' }}>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full text-white text-xs font-black flex items-center justify-center" style={{ backgroundColor: groupColor }}>
              {team.team_number}
            </span>
            <span className="font-bold text-sm text-slate-800">{team.name}</span>
          </div>
          <button onClick={() => handleDeleteTeam(team.id, team.name)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Members */}
        <div className="p-3 space-y-2">
          {members.length > 0 ? (
            <div className="space-y-1">
              {members.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between py-1 px-2 bg-slate-50 rounded-lg text-sm">
                  <span className="font-medium text-slate-700">{m.profiles?.name || '?'}</span>
                  <button onClick={() => handleRemoveStaff(team.id, m.staff_id)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic px-1">No staff assigned</p>
          )}

          {/* Assign dropdown */}
          {unassigned.length > 0 && (
            <select
              className="w-full h-8 text-xs rounded-lg border border-slate-200 bg-white px-2 text-slate-600"
              value=""
              onChange={e => { if (e.target.value) handleAssignStaff(team.id, e.target.value); }}
            >
              <option value="">+ Assign staff member...</option>
              {unassigned.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>
    );
  };

  const renderGroupSection = (group: any) => {
    const groupTeams = getGroupTeams(group.id);
    const isExpanded = expandedGroups.has(group.id);

    return (
      <div key={group.id} className="border-2 rounded-2xl overflow-hidden" style={{ borderColor: group.color + '44' }}>
        {/* Group header */}
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
          style={{ backgroundColor: group.color + '18' }}
          onClick={() => toggleGroup(group.id)}
        >
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: group.color }} />
            <div>
              <span className="font-extrabold text-slate-800">{group.name}</span>
              {group.description && (
                <span className="text-xs text-slate-500 ml-2">{group.description}</span>
              )}
            </div>
            <span className="text-xs font-semibold text-slate-400 bg-white px-2 py-0.5 rounded-full border">
              {groupTeams.length} team{groupTeams.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={e => { e.stopPropagation(); setShowNewTeam(group.id); setNewTeamName(''); setTeamFormError(null); }}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-all hover:opacity-90"
              style={{ backgroundColor: group.color }}
            >
              <Plus className="w-3 h-3" /> Add Team
            </button>
            <button
              onClick={e => { e.stopPropagation(); handleDeleteGroup(group.id, group.name); }}
              className="text-slate-300 hover:text-red-500 transition-colors p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </div>
        </div>

        {isExpanded && (
          <div className="p-4 space-y-3">
            {/* Add team inline form */}
            {showNewTeam === group.id && (
              <form
                onSubmit={e => handleCreateTeam(e, group.id)}
                className="flex gap-2 items-start p-3 rounded-xl border-2 border-dashed animate-in fade-in"
                style={{ borderColor: group.color + '66' }}
              >
                <div className="flex-1">
                  <Input
                    value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                    placeholder="e.g. Ground Floor, Counter A..."
                    className="h-9 text-sm"
                    autoFocus
                  />
                  {teamFormError && <p className="text-xs text-red-500 mt-1">{teamFormError}</p>}
                </div>
                <Button type="submit" size="sm" className="h-9 font-bold" style={{ backgroundColor: group.color }}>Create</Button>
                <Button type="button" size="sm" variant="ghost" className="h-9" onClick={() => setShowNewTeam(null)}>✕</Button>
              </form>
            )}

            {groupTeams.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                No teams in this group yet.{' '}
                <button
                  onClick={() => { setShowNewTeam(group.id); setNewTeamName(''); }}
                  className="underline font-semibold"
                  style={{ color: group.color }}
                >
                  Add a team
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {groupTeams.map((t: any) => renderTeamCard(t, group.color))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1.5">
            <span>📅</span> {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Teams & Groups</h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize teams into category groups. Each group has its own round-robin queue.
          </p>
        </div>
        <Button onClick={() => { setShowNewGroup(true); }} className="font-bold gap-2 shadow-sm">
          <FolderOpen className="w-4 h-4" />
          New Group
        </Button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          {toast}
        </div>
      )}

      {/* New Group Form */}
      {showNewGroup && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-5 shadow-lg text-white animate-in slide-in-from-top-4">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <FolderOpen className="w-5 h-5" /> Create New Group
          </h3>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Group Name *</label>
                <Input
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="e.g. Tops, One Piece, Bottoms..."
                  className="bg-white/10 border-white/20 text-white placeholder-white/40 h-10"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Description (optional)</label>
                <Input
                  value={newGroupDesc}
                  onChange={e => setNewGroupDesc(e.target.value)}
                  placeholder="Short description..."
                  className="bg-white/10 border-white/20 text-white placeholder-white/40 h-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Color</label>
              <div className="flex flex-wrap gap-2">
                {GROUP_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewGroupColor(c)}
                    className={`w-8 h-8 rounded-full transition-all hover:scale-110 ${newGroupColor === c ? 'ring-4 ring-white scale-110' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            {groupFormError && <p className="text-red-300 text-xs">{groupFormError}</p>}
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="font-bold gap-2 bg-white text-slate-800 hover:bg-slate-100">
                <Sparkles className="w-4 h-4" /> Create Group
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowNewGroup(false)} className="text-white hover:bg-white/10">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Main: Groups + Teams */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Groups */}
        <div className="lg:col-span-3 space-y-4">
          {groupsLoading || teamsLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => <div key={i} className="h-32 rounded-2xl animate-pulse bg-slate-100" />)}
            </div>
          ) : (groups as any[]).length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <FolderOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-bold text-slate-600 mb-1">No Groups Yet</h3>
              <p className="text-sm text-slate-400 mb-4">
                Create groups to organize teams (e.g. Tops, One Piece, Bottoms).
              </p>
              <Button onClick={() => setShowNewGroup(true)} className="font-bold">
                <Plus className="w-4 h-4 mr-2" /> Create First Group
              </Button>
            </div>
          ) : (
            (groups as any[]).map(renderGroupSection)
          )}

          {/* Ungrouped teams */}
          {getGroupTeams(null).length > 0 && (
            <div className="border-2 border-slate-200 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer" onClick={() => toggleGroup('none')}>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-slate-400" />
                  <span className="font-bold text-slate-600">Ungrouped Teams</span>
                  <span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded-full border">
                    {getGroupTeams(null).length}
                  </span>
                </div>
                {expandedGroups.has('none') ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </div>
              {expandedGroups.has('none') && (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {getGroupTeams(null).map((t: any) => renderTeamCard(t, '#94a3b8'))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Staff directory */}
        <div className="space-y-4">
          <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-primary" /> Staff Directory
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {(staffList as any[]).length} registered • {(staffList as any[]).filter((s: any) => !assignedStaffIds.has(s.id)).length} unassigned
                </p>
              </div>
              <button
                onClick={() => setShowNewStaff(!showNewStaff)}
                className="text-xs font-bold bg-primary text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:opacity-90"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            <div className="p-3 space-y-3">
              {showNewStaff && (
                <form onSubmit={handleCreateStaff} className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <Input
                    value={newStaffName}
                    onChange={e => setNewStaffName(e.target.value)}
                    placeholder="Staff member name..."
                    className="h-8 text-sm"
                    autoFocus
                  />
                  {staffFormError && <p className="text-xs text-red-500">{staffFormError}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="h-7 text-xs font-bold">Save</Button>
                    <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNewStaff(false)}>Cancel</Button>
                  </div>
                </form>
              )}

              {staffLoading ? (
                <div className="space-y-2 animate-pulse">
                  {[1,2,3].map(i => <div key={i} className="h-8 bg-slate-100 rounded" />)}
                </div>
              ) : (staffList as any[]).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No staff registered yet.</p>
              ) : (
                <div className="divide-y max-h-[60vh] overflow-y-auto">
                  {(staffList as any[]).map((staff: any) => {
                    const assignment = getStaffAssignment(staff.id);
                    return (
                      <div key={staff.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">{staff.name}</p>
                          <div className="mt-0.5">
                            {assignment ? (
                              <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                {assignment.teamName}
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                Unassigned
                              </span>
                            )}
                          </div>
                        </div>
                        <select
                          className="text-[11px] h-7 rounded border border-slate-200 bg-white px-1.5 text-slate-600 max-w-[110px]"
                          value={assignment?.teamId || ''}
                          onChange={e => {
                            if (e.target.value) handleAssignStaff(e.target.value, staff.id);
                            else if (assignment) handleRemoveStaff(assignment.teamId, staff.id);
                          }}
                        >
                          <option value="">(Unassigned)</option>
                          {(teams as any[]).map((t: any) => (
                            <option key={t.id} value={t.id}>
                              {t.name || `T${t.team_number}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
