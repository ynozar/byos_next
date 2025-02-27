import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const DashboardSkeleton = () => {
  return (
    <>
      <div className="grid gap-2 md:gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-5 w-[120px]" />
                  <Skeleton className="h-5 w-[80px]" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Screen</CardTitle>
            <CardDescription>
              <Skeleton className="h-4 w-[250px]" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-3">
              <Skeleton className="h-[240px] w-full rounded-md" />
              <div className="flex justify-end">
                <Skeleton className="h-4 w-[200px]" />
              </div>
              <Skeleton className="h-4 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-2 md:mt-4 gap-4">
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Overview of all connected devices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Online Devices</h3>
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Offline Devices</h3>
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-2 md:mt-4 gap-4">
        <CardHeader>
          <CardTitle>Recent System Logs</CardTitle>
          <CardDescription>
            Latest system events and alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Time</TableHead>
                <TableHead className="w-[40px]">Level</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="max-w-[200px]">Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}; 