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
          team_groups (id, name, color, sort_order),
          team_members (
            id,
            staff_id,
            profiles (id, name, role)
          )
        `)
        .eq('date', today)
        .order('group_id', { ascending: true, nullsFirst: false })
        .order('sort_order', { ascending: true })
        .order('team_number', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    const channelId = `teams_changes_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_teams' }, () => {
        queryClient.invalidateQueries({ queryKey: ['daily_teams', today] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
        queryClient.invalidateQueries({ queryKey: ['daily_teams', today] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient, today]);

  return query;
}
