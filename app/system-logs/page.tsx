import { Suspense } from "react"
import SystemLogsViewer from "@/components/system-logs/system-logs-viewer"
import SystemLogsViewerSkeleton from "@/components/system-logs/system-logs-viewer-skeleton"

export const metadata = {
  title: "System Logs",
  description: "View and search system logs",
}

export default function SystemLogsPage() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">System Logs</h2>
        <p className="text-muted-foreground">View, search, and filter system logs across your application.</p>
      </div>
      <Suspense fallback={<SystemLogsViewerSkeleton />}>
        <SystemLogsViewer />
      </Suspense>
    </div>
  )
}

