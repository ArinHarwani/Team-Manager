import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useRealtimeGroups() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['team_groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_groups')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  useEffect(() => {
    const channelId = `groups_changes_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_groups' }, () => {
        queryClient.invalidateQueries({ queryKey: ['team_groups'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}
