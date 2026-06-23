import { useRealtimeAllocation } from '@/hooks/useRealtimeAllocation';
import { useRealtimeTeams } from '@/hooks/useRealtimeTeams';
import { Hexagon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NextTeamBannerProps {
  isReadonly?: boolean;
}

export function NextTeamBanner({ isReadonly = false }: NextTeamBannerProps) {
  const { data: allocation, isLoading: allocLoading } = useRealtimeAllocation();
  const { data: teams, isLoading: teamsLoading } = useRealtimeTeams();

  if (allocLoading || teamsLoading) {
    return (
      <div className="w-full h-14 bg-slate-100 animate-pulse flex items-center justify-center rounded-lg my-4">
        <div className="h-4 w-48 bg-slate-200 rounded"></div>
      </div>
    );
  }

  let teamName = "None";
  if (teams && teams.length > 0) {
    const nextIndex = allocation?.next_team_index || 0;
    const currentTeam = teams[nextIndex % teams.length];
    teamName = currentTeam?.name || `Team ${currentTeam?.team_number}` || "None";
  }

  return (
    <div 
      className={cn(
        "w-full py-4 px-6 rounded-xl shadow-sm flex items-center justify-center space-x-3 transition-all my-4",
        isReadonly 
          ? "bg-slate-100 text-slate-500 border border-slate-200" 
          : "bg-primary text-primary-foreground shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-blue-600"
      )}
    >
      <Hexagon className={cn("w-6 h-6", !isReadonly && "animate-[spin_4s_linear_infinite]")} />
      <span className="text-lg font-medium tracking-wide uppercase opacity-90">
        Next Customer →
      </span>
      <span className="text-xl font-black tracking-widest uppercase">
        {teamName}
      </span>
    </div>
  );
}
