import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-primary text-primary-foreground p-6 rounded-xl shadow-lg flex items-center justify-center animate-in fade-in slide-in-from-top-4 duration-500">
        <h2 className="text-2xl sm:text-4xl font-black tracking-widest uppercase">
          ⬡ NEXT CUSTOMER → TEAM 1
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tight">Teams & Queue</h3>
          </div>
          {/* Teams Grid placeholder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="bg-muted/50 pb-4">
                <CardTitle>Team 1</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 min-h-[200px]">
                <p className="text-sm text-muted-foreground text-center mt-8">No active customers</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Staff Status</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-sm text-muted-foreground text-center">No staff online</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
