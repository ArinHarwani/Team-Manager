import { Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

export default function StaffLayout() {
  const { profile, signOut } = useAuthStore();

  return (
    <div className="min-h-screen bg-muted/10">
      <nav className="border-b bg-background shadow-sm sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-between h-14 items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <span className="font-semibold">{profile?.name}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
                Team 1 {/* Placeholder for actual team */}
              </span>
              <Button variant="ghost" size="icon" onClick={signOut} title="Log out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-md mx-auto p-4 pb-24">
        <Outlet />
      </main>
    </div>
  );
}
