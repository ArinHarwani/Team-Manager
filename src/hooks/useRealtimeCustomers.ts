import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useRealtimeCustomers() {
  const queryClient = useQueryClient();
  const today = new Date().toLocaleDateString('en-CA');

  const query = useQuery({
    queryKey: ['customers', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          daily_teams (id, name, team_number, group_id, team_groups(id, name, color)),
          team_groups (id, name, color)
        `)
        .eq('date', today)
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  useEffect(() => {
    const channelId = `customers_changes_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        queryClient.invalidateQueries({ queryKey: ['customers', today] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient, today]);

  return query;
}
