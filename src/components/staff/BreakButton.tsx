import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useRealtimeStaffStatus } from '@/hooks/useRealtimeStaffStatus';
import { Button } from '@/components/ui/button';
import { Coffee, Play } from 'lucide-react';

export function BreakButton() {
  const { profile } = useAuthStore();
  const { data: statuses } = useRealtimeStaffStatus();
  const [isLoading, setIsLoading] = useState(false);

  const myStatus = statuses?.find(s => s.staff_id === profile?.id);
  const isOnBreak = myStatus?.status === 'on_break';

  const toggleBreak = async () => {
    if (!profile) return;
    setIsLoading(true);

    try {
      const today = new Date().toLocaleDateString('en-CA');
      
      if (isOnBreak) {
        // End break
        // Find open break record
        const { data: openBreaks } = await supabase
          .from('breaks')
          .select('id, started_at')
          .eq('staff_id', profile.id)
          .is('ended_at', null)
          .order('started_at', { ascending: false })
          .limit(1);

        if (openBreaks && openBreaks.length > 0) {
          const breakRecord = openBreaks[0];
          const start = new Date(breakRecord.started_at);
          const end = new Date();
          const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

          await supabase
            .from('breaks')
            .update({ ended_at: end.toISOString(), duration_minutes: durationMinutes })
            .eq('id', breakRecord.id);
        }

        await supabase
          .from('staff_status')
          .upsert({ staff_id: profile.id, status: 'free', updated_at: new Date().toISOString() });

      } else {
        // Start break
        await supabase
          .from('breaks')
          .insert([{ staff_id: profile.id, started_at: new Date().toISOString(), date: today }]);

        await supabase
          .from('staff_status')
          .upsert({ staff_id: profile.id, status: 'on_break', updated_at: new Date().toISOString() });
      }
    } catch (error) {
      console.error("Failed to toggle break", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      size="lg"
      disabled={isLoading}
      onClick={toggleBreak}
      className={`w-full h-20 text-xl font-bold shadow-md transition-all ${
        isOnBreak 
          ? 'bg-rose-600 hover:bg-rose-700 text-white' 
          : 'bg-purple-600 hover:bg-purple-700 text-white'
      }`}
    >
      {isOnBreak ? (
        <>
          <Play className="w-8 h-8 mr-3 fill-current" />
          End Break & Return
        </>
      ) : (
        <>
          <Coffee className="w-8 h-8 mr-3" />
          Start Break
        </>
      )}
    </Button>
  );
}
