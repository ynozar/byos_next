import type { Device, Log } from "@/lib/supabase/types"

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

// Determine device type based on name or other properties
export function getDeviceType(device: Device): string {
  const name = device.name.toLowerCase()

  if (name.includes("tablet")) return "tablet"
  if (name.includes("kiosk") || name.includes("display")) return "monitor"
  if (name.includes("phone")) return "smartphone"
  if (name.includes("laptop")) return "laptop"

  return "monitor" // Default type
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
