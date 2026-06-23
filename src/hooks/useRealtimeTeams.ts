import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useRealtimeTeams() {
  const queryClient = useQueryClient();
  const today = new Date().toLocaleDateString('en-CA');

  const query = useQuery({
    queryKey: ['daily_teams', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_teams')
        .select(`
          *,
          team_members (
            id,
            staff_id,
            profiles (id, name, role)
          )
        `)
        .eq('date', today)
        .order('team_number', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    const channel = supabase
      .channel('teams_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_teams' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['daily_teams', today] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_members' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['daily_teams', today] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, today]);

  return query;
}
