import { useRealtimeHelpAlerts } from '@/hooks/useRealtimeHelpAlerts';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export function HelpAlertsPanel() {
  const { data: alerts } = useRealtimeHelpAlerts();
  const { profile } = useAuthStore();
  const [resolving, setResolving] = useState<string | null>(null);

  if (!alerts || alerts.length === 0) return null;

  const handleResolve = async (id: string) => {
    setResolving(id);
    try {
      await supabase
        .from('help_requests')
        .update({ 
          resolved: true, 
          resolved_by: profile?.id, 
          resolved_at: new Date().toISOString() 
        })
        .eq('id', id);
    } catch (error) {
      console.error("Failed to resolve alert", error);
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 w-full max-w-sm space-y-3 flex flex-col items-end pointer-events-none">
      {alerts.map(alert => (
        <Card 
          key={alert.id} 
          className="w-full shadow-2xl border-destructive/50 bg-destructive/10 animate-in slide-in-from-right-8 fade-in pointer-events-auto"
        >
          <CardHeader className="py-3 px-4 flex flex-row items-start space-y-0 gap-3 border-b border-destructive/10 bg-white">
            <div className="bg-destructive/10 p-2 rounded-full mt-0.5">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base text-destructive font-bold">Help Requested!</CardTitle>
              <div className="text-sm font-medium mt-1 text-slate-800">
                {alert.profiles?.name} <span className="text-slate-500 font-normal">from</span> {alert.daily_teams?.name}
              </div>
              {alert.customers?.code && (
                <div className="text-xs mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded text-slate-700">
                  Customer: <span className="font-bold">{alert.customers.code}</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3 bg-white flex justify-end">
            <Button 
              size="sm" 
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700 font-bold w-full sm:w-auto shadow-md"
              onClick={() => handleResolve(alert.id)}
              disabled={resolving === alert.id}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {resolving === alert.id ? 'Resolving...' : 'Mark Resolved'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
