import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function StaffDashboard() {
  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="bg-muted text-muted-foreground p-3 rounded-lg text-center text-sm font-semibold border">
        Admin is assigning next to Team 1
      </div>

      <Card className="border-primary/20 shadow-md">
        <CardHeader className="bg-primary/5 pb-4">
          <CardTitle>My Team</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
           <p className="text-sm text-center text-muted-foreground py-4">No active customers</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 pt-4">
        <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2 border-2 hover:border-primary hover:bg-primary/5">
          <span className="font-bold">Start Break</span>
        </Button>
        <Button variant="destructive" className="h-24 flex flex-col items-center justify-center space-y-2 shadow-lg shadow-destructive/20">
          <AlertCircle className="w-6 h-6" />
          <span className="font-bold tracking-wider">HELP</span>
        </Button>
      </div>
    </div>
  );
}
