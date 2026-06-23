import { useRealtimeTeams } from '@/hooks/useRealtimeTeams';
import { useRealtimeCustomers } from '@/hooks/useRealtimeCustomers';
import { useRealtimeStaffStatus } from '@/hooks/useRealtimeStaffStatus';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerBadge } from '../shared/CustomerBadge';
import { StatusChip, StaffStatus } from '../shared/StatusChip';
import { Users2 } from 'lucide-react';

export function MyTeamCard() {
  const { profile } = useAuthStore();
  const { data: teams, isLoading: teamsLoading } = useRealtimeTeams();
  const { data: customers } = useRealtimeCustomers();
  const { data: staffStatuses } = useRealtimeStaffStatus();

  if (teamsLoading) return <Card className="h-48 animate-pulse bg-slate-100"></Card>;

  // Find my team
  let myTeam = null;
  if (teams && profile) {
    myTeam = teams.find(t => t.team_members.some((m: any) => m.staff_id === profile.id));
  }

  if (!myTeam) {
    return (
      <Card className="p-8 text-center border-dashed bg-slate-50">
        <Users2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-slate-600 mb-1">Not Assigned to a Team</h3>
        <p className="text-sm text-slate-500">Wait for the manager to assign you to a team for today.</p>
      </Card>
    );
  }

  const activeCustomers = customers?.filter(c => 
    c.team_id === myTeam.id && 
    !['completed', 'sale_success', 'sale_failed'].includes(c.status)
  ) || [];

  return (
    <Card className="shadow-lg border-primary/20 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent border-b py-4 px-6 flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold flex items-center text-primary">
          <Users2 className="w-6 h-6 mr-3" />
          {myTeam.name || `Team ${myTeam.team_number}`}
        </CardTitle>
        <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold shadow-sm">
          {activeCustomers.length} Customers
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
          {/* Left: Staff */}
          <div className="p-4 bg-white">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Team Members</h4>
            <div className="space-y-3">
              {myTeam.team_members.map((tm: any) => {
                const isMe = tm.staff_id === profile?.id;
                const statusObj = staffStatuses?.find(s => s.staff_id === tm.staff_id);
                const status = statusObj?.status || 'offline';
                
                return (
                  <div key={tm.id} className={`flex items-center justify-between p-2 rounded-lg ${isMe ? 'bg-primary/5 border border-primary/10' : ''}`}>
                    <div className="flex items-center">
                      <span className={`font-medium ${isMe ? 'text-primary font-bold' : ''}`}>
                        {tm.profiles?.name} {isMe && '(You)'}
                      </span>
                    </div>
                    <StatusChip status={status as StaffStatus} />
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Right: Customers */}
          <div className="p-4 bg-slate-50/80">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Our Queue</h4>
            <div className="space-y-2">
              {activeCustomers.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm">
                  <CustomerBadge code={c.code} status={c.status} className="text-sm px-3 py-1" />
                  {c.handler && (
                    <span className="text-xs text-muted-foreground flex items-center">
                      <Users2 className="w-3 h-3 mr-1" />
                      {c.handler.name}
                    </span>
                  )}
                  {!c.handler && (
                    <span className="text-xs italic text-slate-400">Waiting for handler</span>
                  )}
                </div>
              ))}
              {activeCustomers.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-sm">
                  No customers waiting. Take a breather!
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
