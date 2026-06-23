import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, User } from 'lucide-react';

export default function Login() {
  const [isStaff, setIsStaff] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // For Admin, we hide the email field from the UI and use a fixed email under the hood
    // to make the login process simple (just a passcode).
    const loginEmail = isStaff ? email : 'admin@teammanager.com';

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Incorrect passcode or email');
        }
        throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-1 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Store className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Team Manager</CardTitle>
          <CardDescription>
            {isStaff ? 'Enter your staff details to access your dashboard' : 'Enter your admin passcode to continue'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            
            {/* Toggle between Admin and Staff */}
            <div className="flex bg-muted p-1 rounded-lg">
              <button
                type="button"
                onClick={() => { setIsStaff(false); setError(null); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isStaff ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => { setIsStaff(true); setError(null); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isStaff ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
              >
                Staff
              </button>
            </div>

            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20 text-center font-medium animate-in fade-in zoom-in duration-200">
                {error}
              </div>
            )}
            
            {isStaff && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <label className="text-sm font-medium leading-none" htmlFor="email">
                  Email
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@example.com" 
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required={isStaff} 
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="password">
                {isStaff ? 'Password' : 'Admin Passcode'}
              </label>
              <Input 
                id="password" 
                type="password" 
                placeholder={isStaff ? "••••••••" : "e.g. admin123"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full font-semibold" type="submit" disabled={loading}>
              {loading ? 'Authenticating...' : (isStaff ? 'Staff Login' : 'Enter Dashboard')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
