import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { getHostUrl } from "@/utils/helpers";
import { DatabaseInitPrompt } from "@/components/dashboard/database-init-prompt";
import type { Device, SystemLog } from "@/lib/supabase/types";

// Define the error response type
type TableNotFoundError = {
  error: 'table_not_found';
  message: string;
};

// Create Promise-based data fetching functions
const fetchDevices = async (): Promise<Device[] | TableNotFoundError> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('devices')
    .select('*');

  if (error) {
    if (error.code === '42P01') { // This is the error code for "table not found"
      return { error: 'table_not_found', message: 'Devices table not found. Database needs initialization.' };
    }
    console.error('Error fetching devices:', error);
    throw new Error('Failed to fetch devices');
  }

  return data;
};

const fetchSystemLogs = async (): Promise<SystemLog[] | TableNotFoundError> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('system_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    if (error.code === '42P01') { // This is the error code for "table not found"
      return { error: 'table_not_found', message: 'System logs table not found. Database needs initialization.' };
    }
    console.error('Error fetching system logs:', error);
    throw new Error('Failed to fetch system logs');
  }

  return data;
};

export default async function Dashboard() {
  let noDBMode = false;
  let dbInitRequired = false;
  let errorMessage = '';
  const hostUrl = getHostUrl();
  // Check environment variables first
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("Missing Supabase environment variables, entering no db mode");
    noDBMode = true;
  }

  // Create promises that will be passed to client components
  let devicesResult: Device[] | TableNotFoundError;
  let systemLogsResult: SystemLog[] | TableNotFoundError;
  
  if (noDBMode) {
    devicesResult = [];
    systemLogsResult = [];
  } else {
    devicesResult = await fetchDevices();
    systemLogsResult = await fetchSystemLogs();
    
    // Check if database initialization is required
    if ('error' in devicesResult && devicesResult.error === 'table_not_found') {
      dbInitRequired = true;
      noDBMode = true;
      errorMessage += devicesResult.message+'\n';
    } else if ('error' in systemLogsResult && systemLogsResult.error === 'table_not_found') {
      dbInitRequired = true;
      noDBMode = true;
      errorMessage += systemLogsResult.message+'\n';
    }
  }



  // Prepare the data for the DashboardContent component
  const devices = Array.isArray(devicesResult) ? devicesResult : [];
  const systemLogs = Array.isArray(systemLogsResult) ? systemLogsResult : [];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h2 className="mt-10 scroll-m-20 pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">System Overview</h2>
        {(noDBMode || dbInitRequired) && <p className="text-muted-foreground">Your host URL: <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{hostUrl}</span></p>}
      
      </div>

      {noDBMode && (
        <div className="rounded-lg border bg-card p-6 shadow-sm mb-6">
          <h3 className="text-xl font-semibold">No DB Mode</h3>
          <p className="leading-7 [&:not(:first-child)]:mt-2">
            No database environment variables found, or database initialization required. Entering no db mode. Any api will always return 200, and the default screen (simple-text) will be shown to any device requesting <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">api/display</span>. Update the default in <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">/api/display/route.ts</span> to change the screen.</p>
        </div>
      )}
      {dbInitRequired && ( <DatabaseInitPrompt errorMessage={errorMessage} />)}
      {!noDBMode && !dbInitRequired && (
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent
            devicesPromise={Promise.resolve(devices)}
            systemLogsPromise={Promise.resolve(systemLogs)}
            hostUrl={hostUrl}
          />
        </Suspense>
      )}
    </div>
  );
}

