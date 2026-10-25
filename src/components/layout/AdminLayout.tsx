import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { LogOut, Store, Users, LayoutDashboard, RotateCcw } from 'lucide-react';
import { useRealtimeHelpAlerts } from '@/hooks/useRealtimeHelpAlerts';
import { ResetDayModal } from '@/components/admin/ResetDayModal';
import { format } from 'date-fns';

export default function AdminLayout() {
  const { profile, signOut } = useAuthStore();
  const location = useLocation();
  const { data: helpAlerts = [] } = useRealtimeHelpAlerts();
  const pendingCount = (helpAlerts as any[]).filter((h: any) => !h.resolved).length;
  const [showReset, setShowReset] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Teams & Groups', href: '/admin/teams', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left: logo + nav */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Store className="h-4 w-4 text-white" />
                </div>
                <span className="font-extrabold text-lg text-slate-900 hidden sm:block">Team Manager</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-4 py-2 my-3 rounded-lg text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-1.5" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right: alerts + reset + profile */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400 hidden md:block">
                {format(new Date(), 'EEE, MMM d')}
              </span>

              {/* Pending alerts badge */}
              {pendingCount > 0 && (
                <Link to="/admin" className="hidden sm:flex">
                  <div className="flex items-center gap-1.5 bg-amber-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-full animate-pulse">
                    🔔 {pendingCount} Alert{pendingCount !== 1 ? 's' : ''}
                  </div>
                </Link>
              )}

              {/* Reset Day button */}
              <button
                onClick={() => setShowReset(true)}
                className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border-2 border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-400 transition-all"
                title="Reset all today's data"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Day
              </button>

              {/* Profile + logout */}
              <div className="flex items-center gap-2 border-l pl-3 ml-1">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-bold text-slate-800 leading-none">{profile?.name}</p>
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Admin</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={signOut}
                  title="Log out"
                  className="text-slate-400 hover:text-red-500 w-8 h-8"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile nav */}
      <div className="sm:hidden border-b bg-white flex overflow-x-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex-1 flex justify-center items-center gap-1.5 py-3 text-sm font-semibold transition-colors ${
                isActive ? 'text-primary border-b-2 border-primary' : 'text-slate-500'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}
        {/* Mobile reset button */}
        <button
          onClick={() => setShowReset(true)}
          className="flex items-center gap-1 px-3 py-3 text-xs font-bold text-red-500"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      <ResetDayModal isOpen={showReset} onClose={() => setShowReset(false)} />
    </div>
  );
}
