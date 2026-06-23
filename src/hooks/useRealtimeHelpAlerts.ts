import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useRealtimeHelpAlerts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['help_alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('help_requests')
        .select(`
          *,
          profiles:staff_id (id, name),
          daily_teams:team_id (id, name),
          customers:customer_id (id, code)
        `)
        .eq('resolved', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    const channel = supabase
      .channel('help_alerts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'help_requests' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['help_alerts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
