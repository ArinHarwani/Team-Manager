import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useRealtimeCustomers() {
  const queryClient = useQueryClient();

  // Helper to get today's date string in local timezone
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

  const query = useQuery({
    queryKey: ['customers', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          handler:handler_id (id, name, role),
          customer_support (
            staff_id,
            profiles (id, name)
          )
        `)
        .eq('date', today)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    const channel = supabase
      .channel('customers_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['customers', today] });
        }
      )
      // Also subscribe to customer support changes since they are nested
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_support' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['customers', today] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, today]);

  return query;
}
