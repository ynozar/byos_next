"use server"

import { createClient } from "@/lib/supabase/server"
import type { Device, Log, RefreshSchedule } from "@/lib/supabase/types"

/**
 * Fetch a single device by friendly_id
 */
export async function fetchDeviceByFriendlyId(friendlyId: string): Promise<Device | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("friendly_id", friendlyId)
    .single()
  
  if (error) {
    console.error("Error fetching device:", error)
    return null
  }
  
  return data
}

/**
 * Fetch logs for a specific device
 */
export async function fetchDeviceLogs(friendlyId: string): Promise<Log[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("logs")
    .select("*")
    .eq("friendly_id", friendlyId)
    .order("created_at", { ascending: false })
    .limit(50)
  
  if (error) {
    console.error("Error fetching device logs:", error)
    return []
  }
  
  return data || []
}

/**
 * Update a device
 */
export async function updateDevice(device: Partial<Device> & { id: number }): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  // Prepare the update data
  const updateData: Partial<Device> = {
    name: device.name,
    mac_address: device.mac_address,
    api_key: device.api_key,
    friendly_id: device.friendly_id,
    timezone: device.timezone,
    refresh_schedule: device.refresh_schedule as RefreshSchedule,
    updated_at: new Date().toISOString(),
  }
  
  // Remove undefined values
  Object.keys(updateData).forEach(key => {
    if (updateData[key as keyof typeof updateData] === undefined) {
      delete updateData[key as keyof typeof updateData]
    }
  })
  
  const { error } = await supabase
    .from("devices")
    .update(updateData)
    .eq("id", device.id)
  
  if (error) {
    console.error("Error updating device:", error)
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

/**
 * Trigger a screen refresh for a device
 */
export async function refreshDeviceScreen(deviceId: number): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  // In a real implementation, this would trigger the device to refresh its screen
  // For now, we'll just log this action
  const { error } = await supabase
    .from("logs")
    .insert({
      device_id: deviceId,
      log_data: "Manual screen refresh triggered",
      type: "info"
    })
  
  if (error) {
    console.error("Error logging refresh action:", error)
    return { success: false, error: error.message }
  }
  
  // Update the device's next_expected_update time to now + refresh_interval
  const { data: device } = await supabase
    .from("devices")
    .select("refresh_schedule, refresh_interval")
    .eq("id", deviceId)
    .single()
  
  if (device) {
    const refreshRate = device.refresh_schedule?.default_refresh_rate || device.refresh_interval || 300
    const nextUpdate = new Date(Date.now() + refreshRate * 1000).toISOString()
    
    await supabase
      .from("devices")
      .update({
        next_expected_update: nextUpdate,
        last_update_time: new Date().toISOString()
      })
      .eq("id", deviceId)
  }
  
  return { success: true }
} 