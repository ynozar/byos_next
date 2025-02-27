import { Suspense } from "react"
import SystemLogsViewer from "@/components/system-logs/system-logs-viewer"
import SystemLogsViewerSkeleton from "@/components/system-logs/system-logs-viewer-skeleton"

export const metadata = {
  title: "System Logs",
  description: "View and search system logs",
}

export default function SystemLogsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6 px-4">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
        <p className="text-muted-foreground">View, search, and filter system logs across your application.</p>
      </div>

      <Suspense fallback={<SystemLogsViewerSkeleton />}>
        <SystemLogsViewer />
      </Suspense>
    </div>
  )
}

