import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useRealtimeHelpAlerts() {
  const queryClient = useQueryClient();
  const today = new Date().toLocaleDateString('en-CA');

  const query = useQuery({
    queryKey: ['help_requests', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('help_requests')
        .select(`
          *,
          profiles:staff_id (id, name),
          daily_teams:team_id (id, name),
          customers:customer_id (id, code)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    }
  });

  useEffect(() => {
    const channelId = `help_alerts_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'help_requests' }, () => {
        queryClient.invalidateQueries({ queryKey: ['help_requests', today] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient, today]);

  return query;
}
