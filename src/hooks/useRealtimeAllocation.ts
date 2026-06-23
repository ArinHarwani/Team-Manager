import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useRealtimeAllocation() {
  const queryClient = useQueryClient();
  const today = new Date().toLocaleDateString('en-CA');

  const query = useQuery({
    queryKey: ['allocation_state', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('allocation_state')
        .select('*')
        .eq('date', today)
        .single();
      
      // If it doesn't exist, it will throw a PostgrestError with code PGRST116.
      // We will handle the creation logic elsewhere (e.g. on first assignment).
      if (error && error.code !== 'PGRST116') {
         throw error;
      }
      return data || null;
    }
  });

  useEffect(() => {
    const channel = supabase
      .channel('allocation_state_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'allocation_state' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['allocation_state', today] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, today]);

  return query;
}
