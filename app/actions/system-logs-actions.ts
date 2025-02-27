"use server"

import { createClient } from "@/lib/supabase/server"
import type { SystemLog } from "@/lib/supabase/types"

type FetchSystemLogsParams = {
  page: number
  perPage: number
  search?: string
  level?: string
  source?: string
}

type FetchSystemLogsResult = {
  logs: SystemLog[]
  total: number
  uniqueSources: string[]
}

export async function fetchSystemLogs({
  page,
  perPage,
  search,
  level,
  source,
}: FetchSystemLogsParams): Promise<FetchSystemLogsResult> {
  const supabase = await createClient()

  // Calculate pagination
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  // Start building the query
  let query = supabase.from("system_logs").select("*", { count: "exact" })

  // Apply filters
  if (level) {
    query = query.eq("level", level)
  }

  if (source) {
    query = query.eq("source", source)
  }

  if (search) {
    query = query.or(`message.ilike.%${search}%,metadata.ilike.%${search}%`)
  }

  // Get paginated results
  const { data: logs, count, error } = await query.order("created_at", { ascending: false }).range(from, to)

  if (error) {
    console.error("Error fetching system logs:", error)
    throw new Error("Failed to fetch system logs")
  }

  // Get unique sources for the filter dropdown
  const { data: sourcesData } = await supabase.from("system_logs").select("source").order("source")

  const uniqueSources = Array.from(new Set(sourcesData?.map((item) => item.source) || []))

  return {
    logs: logs || [],
    total: count || 0,
    uniqueSources,
  }
}

