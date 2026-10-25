import { useState } from 'react';
import { TeamBoard } from '@/components/admin/TeamBoard';
import { CustomerLogPanel } from '@/components/admin/CustomerLogPanel';
import { HelpAlertsPanel } from '@/components/admin/HelpAlertsPanel';
import { AddCustomerModal } from '@/components/admin/AddCustomerModal';
import { Button } from '@/components/ui/button';
import { PlusCircle, LayoutDashboard, ListOrdered, Bell } from 'lucide-react';

type Tab = 'board' | 'log' | 'alerts';

export default function AdminDashboard() {
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('board');

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Tab switcher */}
        <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
          {([
            { id: 'board', label: 'Live Board', icon: LayoutDashboard },
            { id: 'log',   label: 'Customer Log', icon: ListOrdered },
            { id: 'alerts', label: 'Help Alerts', icon: Bell },
          ] as { id: Tab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <Button
          onClick={() => setIsAddCustomerOpen(true)}
          size="lg"
          className="h-12 font-bold gap-2 shadow-md shadow-primary/20 hover:scale-105 transition-transform"
        >
          <PlusCircle className="w-5 h-5" />
          New Customer
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'board' && <TeamBoard />}
      {activeTab === 'log'   && <CustomerLogPanel />}
      {activeTab === 'alerts' && <HelpAlertsPanel />}

      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
      />
    </div>
  );
}
