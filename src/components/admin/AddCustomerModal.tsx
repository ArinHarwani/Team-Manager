import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRealtimeTeams } from '@/hooks/useRealtimeTeams';
import { useRealtimeAllocation } from '@/hooks/useRealtimeAllocation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { X, Users, AlertCircle } from 'lucide-react';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_CODES = ['1G', '2G', 'HW', 'FAM', 'GRP', 'VIP', 'RET'];

export function AddCustomerModal({ isOpen, onClose }: AddCustomerModalProps) {
  const [code, setCode] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: teams } = useRealtimeTeams();
  const { data: allocation } = useRealtimeAllocation();

  if (!isOpen) return null;

  const handleAutoAssign = async () => {
    if (!code.trim()) {
      setError("Please enter a customer code");
      return;
    }
    if (!teams || teams.length === 0) {
      setError("No teams available today. Please create teams first.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const today = new Date().toLocaleDateString('en-CA');
      
      // 1. Determine next team
      let nextIndex = allocation?.next_team_index || 0;
      // Handle edge case if teams got deleted
      if (nextIndex >= teams.length) nextIndex = 0;
      
      const targetTeam = teams[nextIndex];

      // 2. Insert customer
      const { error: insertError } = await supabase
        .from('customers')
        .insert([{
          code: code.trim(),
          notes: notes.trim(),
          team_id: targetTeam.id,
          date: today,
          assigned_at: new Date().toISOString()
        }]);

      if (insertError) throw insertError;

      // 3. Update allocation state
      const newIndex = (nextIndex + 1) % teams.length;
      const { error: allocError } = await supabase
        .from('allocation_state')
        .upsert({ date: today, next_team_index: newIndex }, { onConflict: 'date' });

      if (allocError) throw allocError;

      // Reset and close
      setCode('');
      setNotes('');
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-lg shadow-xl animate-in zoom-in-95 duration-200">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle className="text-xl flex items-center">
            <Users className="w-5 h-5 mr-2 text-primary" />
            Add New Customer
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {error && (
            <div className="bg-destructive/15 text-destructive p-3 rounded flex items-center text-sm">
              <AlertCircle className="w-4 h-4 mr-2" /> {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Customer Code</label>
            <Input 
              placeholder="e.g. 1G, FAM, VIP" 
              value={code} 
              onChange={e => setCode(e.target.value)}
              className="text-lg font-bold uppercase"
              maxLength={10}
            />
            <div className="flex flex-wrap gap-2 pt-2">
              {COMMON_CODES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCode(c)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-full transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-sm font-medium text-slate-700">Notes (Optional)</label>
            <Input 
              placeholder="Special requirements..." 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4 bg-slate-50">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <div className="space-x-2">
            <Button disabled={isSubmitting} onClick={handleAutoAssign} className="bg-primary hover:bg-primary/90 font-bold">
              {isSubmitting ? 'Assigning...' : 'Assign Auto (Round Robin)'}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
