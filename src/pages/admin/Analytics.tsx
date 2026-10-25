import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRealtimeTeams } from '@/hooks/useRealtimeTeams';
import { useRealtimeCustomers } from '@/hooks/useRealtimeCustomers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle2, Clock, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminAnalytics() {
  const today = new Date().toLocaleDateString('en-CA');
  const { data: teams = [], isLoading: teamsLoading } = useRealtimeTeams();
  const { data: customers = [], isLoading: customersLoading } = useRealtimeCustomers();

  // Query today's help requests
  const { data: helpRequests = [] } = useQuery({
    queryKey: ['admin_analytics_help', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('help_requests')
        .select('*');
      if (error) return [];
      return data || [];
    }
  });

  const totalCustomers = customers.length;
  const completedCustomers = customers.filter(c => ['completed', 'sale_success'].includes(c.status)).length;
  const activeCustomers = customers.filter(c => !['completed', 'sale_success', 'sale_failed'].includes(c.status)).length;
  const successRate = totalCustomers > 0 ? Math.round((completedCustomers / totalCustomers) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center space-x-2 text-primary font-semibold text-sm mb-1">
            <Calendar className="w-4 h-4" />
            <span>Store Performance • {format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Floor Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time store traffic, team workload distribution, and staff metrics.
          </p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs uppercase font-bold text-slate-500">Total Customers</CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground mt-1">Logged today</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs uppercase font-bold text-slate-500">Currently Active</CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600">{activeCustomers}</div>
            <p className="text-xs text-muted-foreground mt-1">Waiting or in consultation</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs uppercase font-bold text-slate-500">Completed & Sales</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">{completedCustomers}</div>
            <p className="text-xs text-muted-foreground mt-1">{successRate}% completion rate</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs uppercase font-bold text-slate-500">Help Requests</CardTitle>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-600">{helpRequests.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{helpRequests.filter(h => !h.resolved).length} unresolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Breakdown Table */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-primary" />
            Team Workload & Allocation Summary
          </CardTitle>
          <CardDescription>
            Performance and customer distribution across today's sales teams.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamsLoading || customersLoading ? (
            <div className="space-y-2 animate-pulse py-4">
              <div className="h-10 bg-slate-100 rounded" />
              <div className="h-10 bg-slate-100 rounded" />
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No teams active today. Configure teams in the Teams tab to see analytics.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b">
                  <tr>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4">Staff Count</th>
                    <th className="py-3 px-4">Total Customers</th>
                    <th className="py-3 px-4">Active</th>
                    <th className="py-3 px-4">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teams.map((t: any) => {
                    const teamCustomers = customers.filter(c => c.team_id === t.id);
                    const teamActive = teamCustomers.filter(c => !['completed', 'sale_success', 'sale_failed'].includes(c.status)).length;
                    const teamCompleted = teamCustomers.filter(c => ['completed', 'sale_success'].includes(c.status)).length;

                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {t.name || `Team ${t.team_number}`}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{t.team_members?.length || 0} members</Badge>
                        </td>
                        <td className="py-3 px-4 font-bold">{teamCustomers.length}</td>
                        <td className="py-3 px-4 text-amber-600 font-semibold">{teamActive}</td>
                        <td className="py-3 px-4 text-emerald-600 font-semibold">{teamCompleted}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
