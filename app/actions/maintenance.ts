"use server"

import { createClient } from "@/lib/supabase/server"
import type { Device, RefreshSchedule } from "@/lib/supabase/types"

/**
 * Initialize the database with a test device
 */
export async function initializeDatabase(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  // Create a test device
  const testDevice = {
    friendly_id: 'device-001',
    name: 'Test Device',
    mac_address: '00:1A:2B:3C:4D:5E',
    api_key: 'abcdef123456',
    screen: 'simple-text',
    refresh_schedule: {
      default_refresh_rate: 60,
      time_ranges: [
        { start_time: "08:00", end_time: "20:00", refresh_rate: 30 }
      ]
    } as RefreshSchedule,
    timezone: 'Europe/London'
  }
  
  const { error } = await supabase
    .from("devices")
    .insert(testDevice)
  
  if (error) {
    console.error("Error initializing database:", error)
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

/**
 * Delete all system logs
 */
export async function deleteAllSystemLogs(): Promise<{ success: boolean; error?: string; count?: number }> {
  const supabase = await createClient()
  
  // First count how many logs will be deleted
  const { count, error: countError } = await supabase
    .from("system_logs")
    .select("*", { count: "exact", head: true })
  
  if (countError) {
    console.error("Error counting system logs:", countError)
    return { success: false, error: countError.message }
  }
  
  // Delete all system logs using a raw SQL query
  // This is safer than using .neq() with an impossible ID for UUID columns
  const { error } = await supabase
    .from("system_logs")
    .delete()
    .gte("id", "00000000-0000-0000-0000-000000000000") // This will match all UUIDs
  
  if (error) {
    console.error("Error deleting system logs:", error)
    return { success: false, error: error.message }
  }
  
  return { success: true, count: count || 0 }
}

/**
 * Delete all device logs
 */
export async function deleteAllDeviceLogs(): Promise<{ success: boolean; error?: string; count?: number }> {
  const supabase = await createClient()
  
  // First count how many logs will be deleted
  const { count, error: countError } = await supabase
    .from("logs")
    .select("*", { count: "exact", head: true })
  
  if (countError) {
    console.error("Error counting device logs:", countError)
    return { success: false, error: countError.message }
  }
  
  // Delete all device logs
  const { error } = await supabase
    .from("logs")
    .delete()
    .gte("id", 0) // This will match all numeric IDs
  
  if (error) {
    console.error("Error deleting device logs:", error)
    return { success: false, error: error.message }
  }
  
  return { success: true, count: count || 0 }
}

/**
 * Add a new device
 */
export async function addDevice(device: Omit<Device, 'id' | 'created_at' | 'updated_at' | 'last_update_time' | 'next_expected_update' | 'last_refresh_duration'>): Promise<{ success: boolean; error?: string; device?: Device }> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("devices")
    .insert(device)
    .select()
    .single()
  
  if (error) {
    console.error("Error adding device:", error)
    return { success: false, error: error.message }
  }
  
  return { success: true, device: data }
}

/**
 * Delete a device by ID
 */
export async function deleteDevice(id: number): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  // First delete all logs associated with this device
  const { error: logsError } = await supabase
    .from("logs")
    .delete()
    .eq("device_id", id)
  
  if (logsError) {
    console.error("Error deleting device logs:", logsError)
    return { success: false, error: logsError.message }
  }
  
  // Then delete the device
  const { error } = await supabase
    .from("devices")
    .delete()
    .eq("id", id)
  
  if (error) {
    console.error("Error deleting device:", error)
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

/**
 * Fix database issues by replacing null values with appropriate defaults
 */
export async function fixDatabaseIssues(): Promise<{ success: boolean; error?: string; fixedCount?: number }> {
  const supabase = await createClient()
  
  // Fetch all devices
  const { data: devices, error: fetchError } = await supabase
    .from("devices")
    .select("*")
  
  if (fetchError) {
    console.error("Error fetching devices:", fetchError)
    return { success: false, error: fetchError.message }
  }
  
  if (!devices || devices.length === 0) {
    return { success: true, fixedCount: 0 }
  }
  
  let fixedCount = 0
  
  // Process each device and fix null values
  for (const device of devices) {
    const updates: Partial<Device> = {}
    
    // Check and fix each field that should have a default value
    if (device.timezone === null) {
      updates.timezone = 'UTC'
      fixedCount++
    }
    
    if (device.refresh_schedule === null) {
      updates.refresh_schedule = {
        default_refresh_rate: 60,
        time_ranges: []
      } as RefreshSchedule
      fixedCount++
    }
    
    // Only update if there are changes to make
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("devices")
        .update(updates)
        .eq("id", device.id)
      
      if (updateError) {
        console.error(`Error updating device ${device.id}:`, updateError)
        return { success: false, error: updateError.message }
      }
    }
  }
  
  return { success: true, fixedCount }
}

/**
 * Fetch all devices
 */
export async function fetchAllDevices(): Promise<Device[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .order("created_at", { ascending: false })
  
  if (error) {
    console.error("Error fetching devices:", error)
    return []
  }
  
  return data || []
} 