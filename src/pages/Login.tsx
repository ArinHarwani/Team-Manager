import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, User, Shield, ArrowLeft } from 'lucide-react';

type LoginMode = 'landing' | 'admin' | 'staff';

export default function Login() {
  const [mode, setMode] = useState<LoginMode>('landing');
  const [staffName, setStaffName] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'admin') {
        // ADMIN LOGIN: Still securely uses Supabase Auth
        const { error } = await supabase.auth.signInWithPassword({
          email: 'admin@teammanager.com',
          password: adminPasscode,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Incorrect passcode provided.');
          }
          throw error;
        }
      } else if (mode === 'staff') {
        // STAFF LOGIN: Completely bypasses Supabase Auth.
        // It checks if the name exists. If yes, it logs in. If no, it inserts.
        const trimmedName = staffName.trim();
        
        if (!trimmedName) throw new Error("Please enter a valid name");

        // 1. Check if profile exists
        const { data: existingProfiles, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .ilike('name', trimmedName)
          .eq('role', 'staff');
          
        if (fetchError) throw fetchError;
        
        if (existingProfiles && existingProfiles.length > 0) {
          // Existing staff member found
          useAuthStore.getState().setStaffProfile(existingProfiles[0]);
          window.location.href = '/staff';
          return;
        } else {
          // 2. Not found, automatically insert a new staff profile
          // Since we removed the foreign key in SQL, this doesn't require an auth.users row!
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert([{ name: trimmedName, role: 'staff', is_active: true }])
            .select()
            .single();
            
          if (insertError) throw insertError;
          
          useAuthStore.getState().setStaffProfile(newProfile);
          window.location.href = '/staff';
          return;
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-1 flex flex-col items-center text-center relative">
          {mode !== 'landing' && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute left-4 top-4"
              onClick={() => { setMode('landing'); setError(null); }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 mt-2">
            <Store className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Team Manager</CardTitle>
          <CardDescription>
            {mode === 'landing' && 'Select how you want to log in'}
            {mode === 'admin' && 'Enter your admin passcode to continue'}
            {mode === 'staff' && 'Enter your staff details'}
          </CardDescription>
        </CardHeader>
        
        {mode === 'landing' ? (
          <CardContent className="space-y-4 flex flex-col pt-4">
            <div className="flex justify-center mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setMode('admin')}
              >
                <Shield className="w-4 h-4 mr-2" />
                Login as Admin
              </Button>
            </div>
            <Button 
              size="lg" 
              className="w-full h-14 text-lg font-semibold"
              onClick={() => setMode('staff')}
            >
              <User className="w-5 h-5 mr-2" />
              Login
            </Button>
          </CardContent>
        ) : (
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20 text-center font-medium animate-in fade-in zoom-in duration-200">
                  {error}
                </div>
              )}
              
              {mode === 'staff' && (
                <div className="space-y-2 animate-in slide-in-from-right-4 duration-300">
                  <label className="text-sm font-medium leading-none" htmlFor="staffName">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="staffName" 
                      type="text" 
                      placeholder="e.g. John Doe" 
                      className="pl-9"
                      value={staffName}
                      onChange={(e) => setStaffName(e.target.value)}
                      required 
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {mode === 'admin' && (
                <div className="space-y-2 animate-in slide-in-from-left-4 duration-300">
                  <label className="text-sm font-medium leading-none" htmlFor="adminPasscode">
                    Admin Passcode
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="adminPasscode" 
                      type="password" 
                      placeholder="e.g. admin123"
                      className="pl-9"
                      value={adminPasscode}
                      onChange={(e) => setAdminPasscode(e.target.value)}
                      required 
                      disabled={loading}
                    />
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button className="w-full font-semibold" type="submit" disabled={loading}>
                {loading ? 'Authenticating...' : (mode === 'staff' ? 'Log In' : 'Enter Dashboard')}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
