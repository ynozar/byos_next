"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { RefreshCw, Save, X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Device } from "@/lib/supabase/types"
import { getDeviceStatus, formatDate } from "@/utils/helpers"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { fetchDeviceByFriendlyId, updateDevice, refreshDeviceScreen } from "@/app/actions/device-actions"
import { toast } from "sonner"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { isValidApiKey, isValidFriendlyId, generateApiKey, generateFriendlyId, timezones, formatTimezone } from "@/utils/helpers"
import DeviceLogsContainer from "@/components/device-logs/device-logs-container"

export default function DevicePage() {
    const router = useRouter()
    const params = useParams()
    const [device, setDevice] = useState<Device & { status?: string; type?: string } | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editedDevice, setEditedDevice] = useState<Device & { status?: string; type?: string } | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // State for validation error messages
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);
    const [friendlyIdError, setFriendlyIdError] = useState<string | null>(null);

    // Fetch device and logs data
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                const friendlyId = params.friendly_id as string

                // Fetch device data
                const deviceData = await fetchDeviceByFriendlyId(friendlyId)

                if (deviceData) {
                    // Add status and type to device
                    const enhancedDevice = {
                        ...deviceData,
                        status: getDeviceStatus(deviceData),
                    }

                    setDevice(enhancedDevice)
                    setEditedDevice(JSON.parse(JSON.stringify(enhancedDevice)))
                } else {
                    // Handle device not found
                    console.error("Device not found")
                    router.push("/")
                }
            } catch (error) {
                console.error("Error fetching device data:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [params.friendly_id, router])

    // Handle form input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!editedDevice) return

        const { name, value } = e.target

        // Validate API key
        if (name === "api_key") {
            if (!isValidApiKey(value)) {
                setApiKeyError("API Key must be alphanumeric and between 20 to 60 characters long.");
            } else {
                setApiKeyError(null);
            }
        }

        // Validate Friendly ID
        if (name === "friendly_id") {
            if (!isValidFriendlyId(value)) {
                setFriendlyIdError("Friendly ID must be exactly 6 uppercase alphanumeric characters.");
            } else {
                setFriendlyIdError(null);
            }
        }

        // Handle nested properties
        if (name.includes(".")) {
            const [parent, child] = name.split(".")
            setEditedDevice({
                ...editedDevice,
                [parent]: {
                    ...(editedDevice[parent as keyof Device] as Record<string, unknown>),
                    [child]: value,
                },
            })
        } else {
            setEditedDevice({
                ...editedDevice,
                [name]: value,
            })
        }
    }

    // Handle nested input changes (for arrays)
    const handleNestedInputChange = (path: string, value: string) => {
        if (!editedDevice) return

        const pathParts = path.split('.')
        const parent = pathParts[0]

        if (parent === 'refresh_schedule' && pathParts[1] === 'time_ranges') {
            const index = parseInt(pathParts[2])
            const field = pathParts[3]

            if (!editedDevice.refresh_schedule) return

            const updatedTimeRanges = [...(editedDevice.refresh_schedule.time_ranges || [])]

            if (!updatedTimeRanges[index]) {
                updatedTimeRanges[index] = { start_time: '', end_time: '', refresh_rate: 300 }
            }

            updatedTimeRanges[index] = {
                ...updatedTimeRanges[index],
                [field]: field === 'refresh_rate' ? parseInt(value) : value
            }

            setEditedDevice({
                ...editedDevice,
                refresh_schedule: {
                    default_refresh_rate: editedDevice.refresh_schedule.default_refresh_rate,
                    time_ranges: updatedTimeRanges
                }
            })
        }
    }

    // Handle select changes
    const handleSelectChange = (name: string, value: string) => {
        if (!editedDevice) return

        // Handle nested properties
        if (name.includes(".")) {
            const [parent, child] = name.split(".")
            setEditedDevice({
                ...editedDevice,
                [parent]: {
                    ...(editedDevice[parent as keyof Device] as Record<string, unknown>),
                    [child]: value,
                },
            })
        } else {
            setEditedDevice({
                ...editedDevice,
                [name]: value,
            })
        }
    }

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!editedDevice) return

        // Validate API key
        if (!isValidApiKey(editedDevice.api_key)) {
            setApiKeyError("API Key must be alphanumeric and between 20 to 60 characters long.");
            return;
        }

        // Validate Friendly ID
        if (!isValidFriendlyId(editedDevice.friendly_id)) {
            setFriendlyIdError("Friendly ID must be exactly 4 uppercase alphanumeric characters.");
            return;
        }

        setIsSaving(true)

        try {
            // Send update to the server
            const result = await updateDevice({
                id: editedDevice.id,
                name: editedDevice.name,
                mac_address: editedDevice.mac_address,
                api_key: editedDevice.api_key,
                friendly_id: editedDevice.friendly_id,
                timezone: editedDevice.timezone,
                refresh_schedule: editedDevice.refresh_schedule,
            })

            if (result.success) {
                // Fetch the updated device to ensure we have the latest data
                const updatedDevice = await fetchDeviceByFriendlyId(editedDevice.friendly_id)

                if (updatedDevice) {
                    // Update the device state with the latest data
                    const enhancedDevice = {
                        ...updatedDevice,
                        status: getDeviceStatus(updatedDevice),
                    }

                    setDevice(enhancedDevice)
                    setEditedDevice(JSON.parse(JSON.stringify(enhancedDevice)))

                    toast("Device updated", {
                        description: "The device has been successfully updated."
                    })
                }
            } else {
                toast.error("Update failed", {
                    description: result.error || "Failed to update device. Please try again."
                })
            }
        } catch (error) {
            console.error("Error updating device:", error)
            toast.error("Update failed", {
                description: "An unexpected error occurred. Please try again."
            })
        } finally {
            setIsSaving(false)
            setIsEditing(false)
        }
    }

    // Cancel editing
    const handleCancel = () => {
        // Reset to original values
        setEditedDevice(JSON.parse(JSON.stringify(device)))
        setIsEditing(false)
    }

    // Handle regenerating API Key
    const handleRegenerateApiKey = () => {
        if (!editedDevice) return;
        const api_key = generateApiKey(editedDevice.mac_address, new Date().toISOString().replace(/[-:Z]/g, "")); // Use a new salt
        setEditedDevice({
            ...editedDevice,
            api_key,
        });
        setApiKeyError(null); // Clear the error message
    }

    // Handle regenerating Friendly ID
    const handleRegenerateFriendlyId = () => {
        if (!editedDevice) return;
        const friendly_id = generateFriendlyId(editedDevice.mac_address, new Date().toISOString().replace(/[-:Z]/g, "")); // Use a new salt
        setEditedDevice({
            ...editedDevice,
            friendly_id,
        });
        setFriendlyIdError(null); // Clear the error message
    }

    // Handle screen refresh
    const handleRefreshScreen = async () => {
        if (!device) return

        setIsRefreshing(true)

        try {
            const result = await refreshDeviceScreen(device.friendly_id)

            if (result.success) {
                // Fetch the updated device to get the new next_expected_update time
                const updatedDevice = await fetchDeviceByFriendlyId(device.friendly_id)

                if (updatedDevice) {
                    // Update the device state with the latest data
                    const enhancedDevice = {
                        ...updatedDevice,
                        status: getDeviceStatus(updatedDevice),
                    }

                    setDevice(enhancedDevice)

                    toast("Screen refresh triggered", {
                        description: "The device screen refresh has been triggered successfully."
                    })
                }
            } else {
                toast.error("Refresh failed", {
                    description: result.error || "Failed to refresh device screen. Please try again."
                })
            }
        } catch (error) {
            console.error("Error refreshing device screen:", error)
            toast.error("Refresh failed", {
                description: "An unexpected error occurred. Please try again."
            })
        } finally {
            setIsRefreshing(false)
        }
    }

    // Add a time range to the refresh schedule
    const handleAddTimeRange = () => {
        if (!editedDevice) return

        const newTimeRange = {
            start_time: "09:00",
            end_time: "17:00",
            refresh_rate: 300,
        }

        const currentTimeRanges = editedDevice.refresh_schedule?.time_ranges || []
        const defaultRefreshRate = editedDevice.refresh_schedule?.default_refresh_rate || 300

        setEditedDevice({
            ...editedDevice,
            refresh_schedule: {
                default_refresh_rate: defaultRefreshRate,
                time_ranges: [...currentTimeRanges, newTimeRange],
            },
        })
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Loading device information...</p>
            </div>
        )
    }

    if (!device) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Device not found</p>
            </div>
        )
    }

    return (

        <div className="max-w-6xl mx-auto p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{device.name}</h2>
                    <Badge variant={device.status === "online" ? "default" : "destructive"} className="text-xs">
                        {device.status}|diff:{new Date().getTime()/1000 - new Date(device.last_update_time || new Date()).getTime()/1000}|{device.last_refresh_duration}
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <>
                            <Button size="sm" variant="outline" onClick={handleCancel} disabled={isSaving}>
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                            </Button>
                            <Button size="sm" onClick={handleSubmit} disabled={isSaving}>
                                {isSaving ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                                Edit Device
                            </Button>
                            <Button size="sm" onClick={handleRefreshScreen} disabled={isRefreshing}>
                                {isRefreshing ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Refreshing...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Refresh Screen
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Device Details and Refresh Schedule */}
            {isEditing ? (
                <Card className="mb-6">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Edit Device Information</CardTitle>
                        <CardDescription className="text-xs">Update device details and configuration</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Device Name</Label>
                                    <Input id="name" name="name" value={editedDevice?.name || ""} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="friendly_id">Friendly ID</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="friendly_id"
                                            name="friendly_id"
                                            value={editedDevice?.friendly_id || ""}
                                            onChange={handleInputChange}
                                            className="font-mono"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={handleRegenerateFriendlyId}
                                            title="Generate new Friendly ID"
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {friendlyIdError && <p className="text-red-500">{friendlyIdError}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="mac_address">MAC Address</Label>
                                    <Input
                                        id="mac_address"
                                        name="mac_address"
                                        value={editedDevice?.mac_address || ""}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="timezone">Timezone</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className="w-full justify-between"
                                            >
                                                {editedDevice?.timezone
                                                    ? formatTimezone(editedDevice.timezone)
                                                    : "Select timezone..."}
                                                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0">
                                            <Command>
                                                <CommandInput placeholder="Search timezone..." />
                                                <CommandEmpty>No timezone found.</CommandEmpty>
                                                <CommandList>
                                                    <ScrollArea className="h-[300px]">
                                                        {["Europe", "North America", "Asia", "Australia & Pacific"].map((region) => (
                                                            <CommandGroup key={region} heading={region}>
                                                                {timezones
                                                                    .filter((timezone) => timezone.region === region)
                                                                    .map((timezone) => (
                                                                        <CommandItem
                                                                            key={timezone.value}
                                                                            value={timezone.value}
                                                                            onSelect={() => {
                                                                                handleSelectChange("timezone", timezone.value);
                                                                            }}
                                                                            className="cursor-pointer"
                                                                        >
                                                                            <span className={cn(
                                                                                "mr-2",
                                                                                editedDevice?.timezone === timezone.value ? "font-medium" : ""
                                                                            )}>
                                                                                {timezone.label}
                                                                            </span>
                                                                        </CommandItem>
                                                                    ))}
                                                            </CommandGroup>
                                                        ))}
                                                    </ScrollArea>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="api_key">API Key</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="api_key"
                                            name="api_key"
                                            value={editedDevice?.api_key || ""}
                                            onChange={handleInputChange}
                                            className="font-mono"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={handleRegenerateApiKey}
                                            title="Generate new API Key"
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {apiKeyError && <p className="text-red-500">{apiKeyError}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="refresh_schedule.default_refresh_rate">Default Refresh Rate (seconds)</Label>
                                    <Input
                                        id="refresh_schedule.default_refresh_rate"
                                        name="refresh_schedule.default_refresh_rate"
                                        type="number"
                                        value={
                                            editedDevice?.refresh_schedule?.default_refresh_rate || 300
                                        }
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-sm font-medium mb-3">Refresh Schedule Time Ranges</h3>
                                {editedDevice?.refresh_schedule?.time_ranges?.map((range, index) => (
                                    <div key={index} className="grid grid-cols-3 gap-2 items-end mb-3">
                                        <div className="space-y-1">
                                            <Label htmlFor={`start_time_${index}`} className="text-xs">
                                                Start Time
                                            </Label>
                                            <Input
                                                id={`start_time_${index}`}
                                                name={`start_time_${index}`}
                                                value={range.start_time}
                                                onChange={(e) => handleNestedInputChange(`refresh_schedule.time_ranges.${index}.start_time`, e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor={`end_time_${index}`} className="text-xs">
                                                End Time
                                            </Label>
                                            <Input
                                                id={`end_time_${index}`}
                                                name={`end_time_${index}`}
                                                value={range.end_time}
                                                onChange={(e) => handleNestedInputChange(`refresh_schedule.time_ranges.${index}.end_time`, e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor={`refresh_rate_${index}`} className="text-xs">
                                                Refresh Rate (seconds)
                                            </Label>
                                            <Input
                                                id={`refresh_rate_${index}`}
                                                name={`refresh_schedule.time_ranges.${index}.refresh_rate`}
                                                type="number"
                                                value={range.refresh_rate}
                                                onChange={(e) => handleNestedInputChange(`refresh_schedule.time_ranges.${index}.refresh_rate`, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}

                                {(!editedDevice?.refresh_schedule?.time_ranges ||
                                    editedDevice.refresh_schedule.time_ranges.length === 0) && (
                                        <p className="text-sm text-muted-foreground">No custom time ranges configured.</p>
                                    )}

                                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={handleAddTimeRange}>
                                    Add Time Range
                                </Button>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Changes"
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            ) : (
                <Card className="mb-6">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Device Information</CardTitle>
                        <CardDescription className="text-xs">View device details and configuration</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Device Name</p>
                                <p className="text-sm font-medium">{device.name}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Friendly ID</p>
                                <p className="text-sm font-medium">{device.friendly_id}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">MAC Address</p>
                                <p className="text-sm font-medium">{device.mac_address}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Timezone</p>
                                <p className="text-sm font-medium">{formatTimezone(device.timezone)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Default Refresh Rate</p>
                                <p className="text-sm font-medium">
                                    {device.refresh_schedule?.default_refresh_rate || 300} seconds
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Last Updated</p>
                                <p className="text-sm font-medium">
                                    {device.last_update_time ? formatDate(device.last_update_time) : "Never"}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Device Logs */}
            {device && !isLoading && (
                <DeviceLogsContainer device={device} />
            )}
        </div>
    )
}