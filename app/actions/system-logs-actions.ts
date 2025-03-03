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
    
    // Check if it's a range error (page out of bounds)
    if (error.message.includes("range") || error.code === "22003") {
      // Return empty results with the correct count
      const { data: sourcesData } = await supabase.from("system_logs").select("source").order("source")
      const uniqueSources = Array.from(new Set(sourcesData?.map((item) => item.source) || []))
      
      return {
        logs: [],
        total: count || 0,
        uniqueSources,
      }
    }
    
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

/**
 * Fetch system logs that contain device information in the metadata
 */
export type FetchDeviceSystemLogsParams = {
  page: number
  perPage: number
  search?: string
  level?: string
  source?: string
  deviceId?: number
  friendlyId?: string
  macAddress?: string
  apiKey?: string
}

export async function fetchDeviceSystemLogs({
  page,
  perPage,
  search,
  level,
  source,
  deviceId,
  friendlyId,
  macAddress,
  apiKey,
}: FetchDeviceSystemLogsParams): Promise<FetchSystemLogsResult> {
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

  // Build search conditions for device-related metadata
  const searchConditions = []

  if (search) {
    searchConditions.push(`message.ilike.%${search}%`)
    searchConditions.push(`metadata.ilike.%${search}%`)
  }

  // Add device-specific search conditions
  if (deviceId) {
    searchConditions.push(`metadata.ilike.%"device_id":${deviceId}%`)
    searchConditions.push(`metadata.ilike.%"id":${deviceId}%`)
  }

  if (friendlyId) {
    searchConditions.push(`metadata.ilike.%"friendly_id":"${friendlyId}"%`)
  }

  if (macAddress) {
    searchConditions.push(`metadata.ilike.%"mac_address":"${macAddress}"%`)
  }

  if (apiKey) {
    searchConditions.push(`metadata.ilike.%"api_key":"${apiKey}"%`)
  }

  // Apply search conditions if any
  if (searchConditions.length > 0) {
    query = query.or(searchConditions.join(","))
  }

  // Get paginated results
  const { data: logs, count, error } = await query.order("created_at", { ascending: false }).range(from, to)

  if (error) {
    console.error("Error fetching device system logs:", error)
    
    // Check if it's a range error (page out of bounds)
    if (error.message.includes("range") || error.code === "22003") {
      // Return empty results with the correct count
      const { data: sourcesData } = await supabase.from("system_logs").select("source").order("source")
      const uniqueSources = Array.from(new Set(sourcesData?.map((item) => item.source) || []))
      
      return {
        logs: [],
        total: count || 0,
        uniqueSources,
      }
    }
    
    throw new Error("Failed to fetch device system logs")
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

