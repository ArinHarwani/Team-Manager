import { NextTeamBanner } from '@/components/shared/NextTeamBanner';
import { MyTeamCard } from '@/components/staff/MyTeamCard';
import { BreakButton } from '@/components/staff/BreakButton';
import { HelpButton } from '@/components/staff/HelpButton';

export default function StaffDashboard() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24">
      {/* Banner */}
      <NextTeamBanner isReadonly />
      
      {/* Core Team View */}
      <MyTeamCard />
      
      {/* Action Buttons Pinned to bottom on mobile, inline on desktop */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50 md:relative md:bg-transparent md:backdrop-blur-none md:border-none md:shadow-none md:p-0">
        <div className="max-w-3xl mx-auto flex gap-4">
          <div className="w-1/2">
            <BreakButton />
          </div>
          <div className="w-1/2">
            <HelpButton />
          </div>
        </div>
      </div>
    </div>
  );
}
