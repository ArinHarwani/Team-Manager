import { useRealtimeTeams } from '@/hooks/useRealtimeTeams';
import { useRealtimeCustomers } from '@/hooks/useRealtimeCustomers';
import { useRealtimeStaffStatus } from '@/hooks/useRealtimeStaffStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerBadge } from '../shared/CustomerBadge';
import { StatusChip, StaffStatus } from '../shared/StatusChip';

interface TeamCardProps {
  team: any;
  customers: any[];
  staffStatuses: any[];
}

function TeamCard({ team, customers, staffStatuses }: TeamCardProps) {
  // Get active customers for this team (not completed or failed)
  const activeCustomers = customers.filter(c => 
    c.team_id === team.id && 
    !['completed', 'sale_success', 'sale_failed'].includes(c.status)
  );

  return (
    <Card className="shadow-sm border-slate-200 overflow-hidden flex flex-col">
      <CardHeader className="bg-slate-50 border-b py-3 px-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-bold">
          {team.name || `Team ${team.team_number}`}
        </CardTitle>
        <span className="text-xs font-medium bg-white px-2 py-1 rounded-md border shadow-sm text-muted-foreground">
          {activeCustomers.length} Active
        </span>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        {/* Staff List */}
        <div className="bg-white p-3 space-y-2 flex-1">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Members</h4>
          {team.team_members && team.team_members.map((tm: any) => {
            const profile = tm.profiles;
            const statusObj = staffStatuses.find(s => s.staff_id === tm.staff_id);
            const status = statusObj?.status || 'offline';
            
            return (
              <div key={tm.id} className="flex items-center justify-between">
                <span className="text-sm font-medium">{profile?.name}</span>
                <StatusChip status={status as StaffStatus} className="text-[10px] py-0 h-5" />
              </div>
            );
          })}
          {(!team.team_members || team.team_members.length === 0) && (
            <div className="text-xs text-muted-foreground italic">No members assigned</div>
          )}
        </div>

        {/* Customers List */}
        <div className="bg-slate-50 p-3 border-t">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Customers</h4>
          <div className="flex flex-wrap gap-2">
            {activeCustomers.map(c => (
              <CustomerBadge key={c.id} code={c.code} status={c.status} />
            ))}
            {activeCustomers.length === 0 && (
              <div className="text-xs text-muted-foreground italic">No active customers</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TeamBoard() {
  const { data: teams, isLoading: teamsLoading } = useRealtimeTeams();
  const { data: customers, isLoading: customersLoading } = useRealtimeCustomers();
  const { data: staffStatuses, isLoading: statusLoading } = useRealtimeStaffStatus();

  if (teamsLoading || customersLoading || statusLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="h-64 animate-pulse bg-slate-100 border-none"></Card>
        ))}
      </div>
    );
  }

  if (!teams || teams.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed bg-slate-50">
        <h3 className="text-lg font-medium text-slate-600 mb-2">No Teams Configured</h3>
        <p className="text-sm text-slate-500">Go to the Teams tab to set up today's structure.</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {teams.map((t: any) => (
        <TeamCard 
          key={t.id} 
          team={t} 
          customers={customers || []} 
          staffStatuses={staffStatuses || []} 
        />
      ))}
    </div>
  );
}
