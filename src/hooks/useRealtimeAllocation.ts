import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Per-group allocation state
export function useGroupAllocationState(groupId?: string) {
  const queryClient = useQueryClient();
  const today = new Date().toLocaleDateString('en-CA');

  const query = useQuery({
    queryKey: ['group_allocation_state', groupId ?? 'all', today],
    queryFn: async () => {
      if (!groupId) {
        // fetch all group states for today
        const { data, error } = await supabase
          .from('group_allocation_state')
          .select('*')
          .eq('date', today);
        if (error) throw error;
        return data || [];
      }
      const { data, error } = await supabase
        .from('group_allocation_state')
        .select('*')
        .eq('group_id', groupId)
        .eq('date', today)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    const channelId = `alloc_state_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_allocation_state' }, () => {
        queryClient.invalidateQueries({ queryKey: ['group_allocation_state'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

// Legacy single allocation hook (for backward compat)
export function useRealtimeAllocation() {
  return useGroupAllocationState();
}
