import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useRealtimeStaffStatus } from '@/hooks/useRealtimeStaffStatus';
import { useRealtimeTeams } from '@/hooks/useRealtimeTeams';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export function HelpButton() {
  const { profile } = useAuthStore();
  const { data: statuses } = useRealtimeStaffStatus();
  const { data: teams } = useRealtimeTeams();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const myStatus = statuses?.find(s => s.staff_id === profile?.id);
  
  // Find my team
  let myTeamId = null;
  if (teams && profile) {
    for (const t of teams) {
      if (t.team_members && t.team_members.some((m: any) => m.staff_id === profile.id)) {
        myTeamId = t.id;
        break;
      }
    }
  }

  const sendHelp = async () => {
    if (!profile) return;
    setIsLoading(true);

    try {
      await supabase
        .from('help_requests')
        .insert([{
          staff_id: profile.id,
          team_id: myTeamId,
          customer_id: myStatus?.current_customer_id || null,
          message: 'Emergency assist needed on floor',
        }]);
      
      setSent(true);
      setIsConfirming(false);
      
      // Reset sent status after 3 seconds
      setTimeout(() => setSent(false), 3000);
    } catch (error) {
      console.error("Failed to send help request", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <Button disabled className="w-full h-20 text-xl font-bold bg-emerald-600 text-white shadow-md">
        Help is on the way!
      </Button>
    );
  }

  if (isConfirming) {
    return (
      <div className="flex gap-4 w-full h-20">
        <Button 
          variant="outline" 
          className="flex-1 h-full text-lg font-bold"
          onClick={() => setIsConfirming(false)}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button 
          className="flex-1 h-full text-lg font-bold bg-destructive hover:bg-destructive/90 text-white shadow-lg animate-pulse"
          onClick={sendHelp}
          disabled={isLoading}
        >
          {isLoading ? 'Sending...' : 'Confirm Request'}
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="lg"
      variant="destructive"
      onClick={() => setIsConfirming(true)}
      className="w-full h-20 text-2xl font-black uppercase shadow-[0_8px_30px_rgb(225,29,72,0.4)] hover:scale-[1.02] transition-transform bg-gradient-to-r from-destructive to-rose-600"
    >
      <AlertTriangle className="w-10 h-10 mr-3" />
      Get Help
    </Button>
  );
}
