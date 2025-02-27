import { networkInterfaces } from "os";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

const getLocalIPAddresses = () => {
  const nets = networkInterfaces();
  const results: { [key: string]: string[] } = Object.create(null);

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
      if (net.family === familyV4Value && !net.internal) {
        if (!results[name]) {
          results[name] = [];
        }
        results[name].push(net.address);
      }
    }
  }

  // Return the first found non-internal IPv4 address
  return results[Object.keys(results)[0]]?.[0] || 'No IP found';
};

// Create Promise-based data fetching functions
const fetchDevices = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('devices')
    .select('*');
  
  if (error) {
    console.error('Error fetching devices:', error);
    throw new Error('Failed to fetch devices');
  }
  
  return data;
};

const fetchSystemLogs = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('system_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error('Error fetching system logs:', error);
    throw new Error('Failed to fetch system logs');
  }
  
  return data;
};

export default function Dashboard() {
  // Create promises that will be passed to client components
  const devicesPromise = fetchDevices();
  const systemLogsPromise = fetchSystemLogs();
  
  const hostUrl = process.env.NODE_ENV === 'production' 
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` 
    : `http://${getLocalIPAddresses()}:${process.env.PORT || 3000}`;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">System Overview</h2>
      </div>
      
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent 
          devicesPromise={devicesPromise} 
          systemLogsPromise={systemLogsPromise} 
          hostUrl={hostUrl} 
        />
      </Suspense>
    </div>
  );
}

