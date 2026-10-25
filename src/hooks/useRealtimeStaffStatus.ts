import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useRealtimeStaffStatus() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['staff_status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_status')
        .select(`
          *,
          profiles (*)
        `);
      
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    const channelId = `staff_status_changes_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_status' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['staff_status'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
