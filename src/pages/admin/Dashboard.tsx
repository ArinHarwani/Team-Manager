import { useState } from 'react';
import { NextTeamBanner } from '@/components/shared/NextTeamBanner';
import { TeamBoard } from '@/components/admin/TeamBoard';
import { StaffStatusBoard } from '@/components/admin/StaffStatusBoard';
import { AddCustomerModal } from '@/components/admin/AddCustomerModal';
import { HelpAlertsPanel } from '@/components/admin/HelpAlertsPanel';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function AdminDashboard() {
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <NextTeamBanner />
        </div>
        <Button 
          onClick={() => setIsAddCustomerOpen(true)}
          size="lg"
          className="h-14 md:w-auto w-full text-lg shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
        >
          <PlusCircle className="w-6 h-6 mr-2" />
          New Customer
        </Button>
      </div>

      {/* Main Boards */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left side: Teams (takes 3 columns on large screens) */}
        <div className="xl:col-span-3">
          <TeamBoard />
        </div>
        
        {/* Right side: Staff Status (takes 1 column) */}
        <div className="xl:col-span-1">
          <StaffStatusBoard />
        </div>
      </div>

      <AddCustomerModal 
        isOpen={isAddCustomerOpen} 
        onClose={() => setIsAddCustomerOpen(false)} 
      />
      <HelpAlertsPanel />
    </div>
  );
}
