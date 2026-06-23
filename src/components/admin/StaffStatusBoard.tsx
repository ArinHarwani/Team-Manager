import { useRealtimeStaffStatus } from '@/hooks/useRealtimeStaffStatus';
import { useRealtimeTeams } from '@/hooks/useRealtimeTeams';
import { useRealtimeCustomers } from '@/hooks/useRealtimeCustomers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusChip, StaffStatus } from '../shared/StatusChip';
import { UserCircle2 } from 'lucide-react';

export function StaffStatusBoard() {
  const { data: statuses, isLoading: statusLoading } = useRealtimeStaffStatus();
  const { data: teams, isLoading: teamsLoading } = useRealtimeTeams();
  const { data: customers } = useRealtimeCustomers();

  if (statusLoading || teamsLoading) {
    return (
      <Card className="h-[600px] flex flex-col shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg flex items-center">
            <UserCircle2 className="w-5 h-5 mr-2 text-primary" />
            Floor Staff
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="animate-pulse space-y-4 w-full">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-slate-100 rounded-md w-full"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find team for a staff member
  const getStaffTeam = (staffId: string) => {
    if (!teams) return null;
    for (const t of teams) {
      if (t.team_members.some((m: any) => m.staff_id === staffId)) {
        return t.name || `Team ${t.team_number}`;
      }
    }
    return 'Unassigned';
  };

  // Find customer code for a staff member
  const getCustomerCode = (customerId: string | null) => {
    if (!customerId || !customers) return null;
    const c = customers.find((c: any) => c.id === customerId);
    return c ? c.code : null;
  };

  return (
    <Card className="flex flex-col shadow-sm max-h-[800px]">
      <CardHeader className="pb-3 border-b bg-slate-50/50">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <UserCircle2 className="w-5 h-5 mr-2 text-primary" />
            Floor Staff
          </div>
          <span className="text-xs font-normal text-muted-foreground bg-slate-200 px-2 py-0.5 rounded-full">
            {statuses?.length || 0} Total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        <div className="divide-y">
          {statuses?.map((s: any) => {
            const team = getStaffTeam(s.staff_id);
            const customerCode = getCustomerCode(s.current_customer_id);

            return (
              <div key={s.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{s.profiles?.name || 'Unknown'}</span>
                  <span className="text-xs text-muted-foreground">{team}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  {customerCode && (
                    <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded">
                      {customerCode}
                    </span>
                  )}
                  <StatusChip status={s.status as StaffStatus} />
                </div>
              </div>
            );
          })}
          
          {(!statuses || statuses.length === 0) && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No staff members logged in today.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
