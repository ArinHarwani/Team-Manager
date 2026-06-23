import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Bell, LogOut, Store, Users, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminLayout() {
  const { profile, signOut } = useAuthStore();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: Store },
    { name: 'Teams', href: '/admin/teams', icon: Users },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-muted/20">
      <nav className="border-b bg-background shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Store className="h-6 w-6 text-primary mr-2" />
                <span className="font-bold text-lg hidden sm:block">Team Manager</span>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'border-primary text-foreground'
                          : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm font-medium text-muted-foreground hidden sm:block">
                {format(new Date(), 'EEEE, MMM d')}
              </div>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
              </Button>
              <div className="flex items-center space-x-2 ml-4 border-l pl-4">
                <span className="text-sm font-medium">{profile?.name}</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full uppercase tracking-wider font-semibold">
                  Admin
                </span>
                <Button variant="ghost" size="icon" onClick={signOut} title="Log out">
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile nav */}
      <div className="sm:hidden border-b bg-background flex overflow-x-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex-1 flex justify-center items-center py-3 text-sm font-medium transition-colors ${
                isActive ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {item.name}
            </Link>
          );
        })}
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
