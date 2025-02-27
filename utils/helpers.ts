import type { Device, Log } from "@/lib/supabase/types"
import crypto from "crypto"

// Format date to a readable format
export function formatDate(dateString: string | null): string {
  if (!dateString) return "Never"

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return `${diffSecs}s ago`
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

// Determine device status based on next expected update time
export function getDeviceStatus(device: Device): "online" | "offline" {
  if (!device.next_expected_update) return "offline"

  const nextExpectedUpdate = new Date(device.next_expected_update)
  const now = new Date()

  // Device is offline if current time is past the next expected update time
  return now < nextExpectedUpdate ? "online" : "offline"
}

// Parse log data to determine log type
export function getLogType(log: Log): "error" | "warning" | "info" {
  const logData = log.log_data.toLowerCase()

  if (logData.includes("error") || logData.includes("fail")) return "error"
  if (logData.includes("warn")) return "warning"

  return "info"
}

// Custom debounce function implementation
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Add validation functions for API key and friendly ID
export const isValidApiKey = (key: string): boolean => {
    const regex = /^[a-zA-Z0-9]{20,60}$/; // Alphanumeric, 20-60 characters
    return regex.test(key);
}

export const isValidFriendlyId = (id: string): boolean => {
    const regex = /^[A-Z0-9]{6}$/; // 6 uppercase alphanumeric characters
    return regex.test(id);
}


// Add the new hashing and generation functions with types
export function hashString(input: string, salt: string, length: number, charset: string): string {
  const hash = crypto.createHmac("sha256", salt).update(input).digest("hex");
  let result = "";
  for (let i = 0; i < length; i++) {
      result += charset[parseInt(hash.slice(i * 2, i * 2 + 2), 16) % charset.length];
  }
  return result;
}

export function generateApiKey(macAddress: string, salt: string = "API_KEY_SALT"): string {
  macAddress = macAddress.toUpperCase().replace(/[:-]/g, ""); // Normalize MAC
  const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return hashString(macAddress, salt, 22, characters);
}

export function generateFriendlyId(macAddress: string, salt: string = "FRIENDLY_ID_SALT"): string {
  macAddress = macAddress.toUpperCase().replace(/[:-]/g, ""); // Normalize MAC
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return hashString(macAddress, salt, 6, characters);
}