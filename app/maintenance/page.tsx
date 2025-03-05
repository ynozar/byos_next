"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { RefreshCw, Search } from "lucide-react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";

import { initializeDatabase, deleteAllSystemLogs, deleteAllDeviceLogs, addDevice, deleteDevice, fixDatabaseIssues, fetchAllDevices } from "@/app/actions/maintenance";
import type { Device, RefreshSchedule } from "@/lib/supabase/types";
import { formatTimezone, generateApiKey, generateFriendlyId, isValidApiKey, isValidFriendlyId, timezones } from "@/utils/helpers";
import { cn } from "@/lib/utils";

export default function MaintenancePage() {
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [devices, setDevices] = useState<Device[]>([])
    const [isAddDeviceDialogOpen, setIsAddDeviceDialogOpen] = useState<boolean>(false)
    const [newDevice, setNewDevice] = useState<{
        name: string
        friendly_id: string
        mac_address: string
        api_key: string
        screen: string
        timezone: string
    }>({
        name: "",
        friendly_id: "",
        mac_address: "",
        api_key: "",
        screen: "simple-text",
        timezone: "Europe/London"
    })

    // For database initialization
    const [initDbParams, setInitDbParams] = useState<{
        device_name: string
        mac_address: string
        friendly_id: string
        api_key: string
        timezone: string
    }>({
        device_name: "Test Device",
        mac_address: "AA:BB:CC:DD:EE:FF",
        friendly_id: "",
        api_key: "",
        timezone: "Europe/London"
    })

    const [isInitDbDialogOpen, setIsInitDbDialogOpen] = useState<boolean>(false)

    // Fetch devices on page load
    useEffect(() => {
        const loadDevices = async () => {
            setIsLoading(true)
            const devicesData = await fetchAllDevices()
            setDevices(devicesData)
            setIsLoading(false)
        }

        loadDevices()
    }, [])

    // Generate friendly ID and API key when MAC address changes
    useEffect(() => {
        if (newDevice.mac_address) {
            const friendlyId = generateFriendlyId(newDevice.mac_address)
            const apiKey = generateApiKey(newDevice.mac_address)

            setNewDevice(prev => ({
                ...prev,
                friendly_id: friendlyId,
                api_key: apiKey
            }))
        }
    }, [newDevice.mac_address])

    // Generate friendly ID and API key for init DB when MAC address changes
    useEffect(() => {
        if (initDbParams.mac_address) {
            const friendlyId = generateFriendlyId(initDbParams.mac_address)
            const apiKey = generateApiKey(initDbParams.mac_address)

            setInitDbParams(prev => ({
                ...prev,
                friendly_id: friendlyId,
                api_key: apiKey
            }))
        }
    }, [initDbParams.mac_address])


    // Handle initializing the database
    const handleInitializeDatabase = async () => {
        if (!initDbParams.device_name || !initDbParams.mac_address) {
            toast.error("Device name and MAC address are required")
            return
        }

        if (!isValidFriendlyId(initDbParams.friendly_id)) {
            toast.error("Invalid friendly ID format. Must be 6 uppercase alphanumeric characters.")
            return
        }

        if (!isValidApiKey(initDbParams.api_key)) {
            toast.error("Invalid API key format. Must be 20-60 alphanumeric characters.")
            return
        }

        setIsLoading(true)
        const result = await initializeDatabase(
            initDbParams.device_name,
            initDbParams.mac_address,
            initDbParams.friendly_id,
            initDbParams.api_key,
            initDbParams.timezone
        )
        setIsLoading(false)
        setIsInitDbDialogOpen(false)

        if (result.success) {
            toast.success("Database initialized successfully")
            // Refresh devices list
            const devicesData = await fetchAllDevices()
            setDevices(devicesData)
        } else {
            toast.error(`Failed to initialize database: ${result.error}`)
        }
    }

    // Handle MAC address change for init DB
    const handleInitDbInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setInitDbParams(prev => ({
            ...prev,
            [name]: value
        }))
    }

    // Handle regenerating friendly ID for init DB
    const handleRegenerateFriendlyIdForInitDb = () => {
        if (!initDbParams.mac_address) {
            toast.error("MAC address is required to generate friendly ID")
            return
        }

        const friendlyId = generateFriendlyId(initDbParams.mac_address, new Date().toISOString().replace(/[-:Z]/g, ""));
        setInitDbParams(prev => ({
            ...prev,
            friendly_id: friendlyId
        }))
    }

    // Handle regenerating API key for init DB
    const handleRegenerateApiKeyForInitDb = () => {
        if (!initDbParams.mac_address) {
            toast.error("MAC address is required to generate API key")
            return
        }

        const apiKey = generateApiKey(initDbParams.mac_address, new Date().toISOString().replace(/[-:Z]/g, ""));
        setInitDbParams(prev => ({
            ...prev,
            api_key: apiKey
        }))
    }

    // Handle deleting all system logs
    const handleDeleteAllSystemLogs = async () => {
        if (!confirm("Are you sure you want to delete ALL system logs? This action cannot be undone.")) {
            return
        }

        setIsLoading(true)
        const result = await deleteAllSystemLogs()
        setIsLoading(false)

        if (result.success) {
            toast.success(`Successfully deleted ${result.count} system logs`)
        } else {
            toast.error(`Failed to delete system logs: ${result.error}`)
        }
    }

    // Handle deleting all device logs
    const handleDeleteAllDeviceLogs = async () => {
        if (!confirm("Are you sure you want to delete ALL device logs? This action cannot be undone.")) {
            return
        }

        setIsLoading(true)
        const result = await deleteAllDeviceLogs()
        setIsLoading(false)

        if (result.success) {
            toast.success(`Successfully deleted ${result.count} device logs`)
        } else {
            toast.error(`Failed to delete device logs: ${result.error}`)
        }
    }

    // Handle fixing database issues
    const handleFixDatabaseIssues = async () => {
        if (!confirm("Are you sure you want to fix database issues? This will replace null values with appropriate defaults.")) {
            return
        }

        setIsLoading(true)
        const result = await fixDatabaseIssues()
        setIsLoading(false)

        if (result.success) {
            toast.success(`Successfully fixed ${result.fixedCount} issues`)
            // Refresh devices list
            const devicesData = await fetchAllDevices()
            setDevices(devicesData)
        } else {
            toast.error(`Failed to fix database issues: ${result.error}`)
        }
    }

    // Handle MAC address change for new device
    const handleMacAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target
        setNewDevice(prev => ({
            ...prev,
            mac_address: value
        }))

        // Generate friendly ID and API key
        if (value) {
            const friendlyId = generateFriendlyId(value)
            const apiKey = generateApiKey(value)

            setNewDevice(prev => ({
                ...prev,
                friendly_id: friendlyId,
                api_key: apiKey
            }))
        }
    }

    // Handle regenerating friendly ID
    const handleRegenerateFriendlyId = () => {
        if (!newDevice.mac_address) {
            toast.error("MAC address is required to generate friendly ID")
            return
        }

        const friendlyId = generateFriendlyId(newDevice.mac_address)
        setNewDevice(prev => ({
            ...prev,
            friendly_id: friendlyId
        }))
    }

    // Handle regenerating API key
    const handleRegenerateApiKey = () => {
        if (!newDevice.mac_address) {
            toast.error("MAC address is required to generate API key")
            return
        }

        const apiKey = generateApiKey(newDevice.mac_address)
        setNewDevice(prev => ({
            ...prev,
            api_key: apiKey
        }))
    }

    // Handle adding a new device
    const handleAddDevice = async () => {
        // Validate inputs
        if (!newDevice.name || !newDevice.mac_address) {
            toast.error("Device name and MAC address are required")
            return
        }

        if (!isValidFriendlyId(newDevice.friendly_id)) {
            toast.error("Invalid friendly ID format. Must be 6 uppercase alphanumeric characters.")
            return
        }

        if (!isValidApiKey(newDevice.api_key)) {
            toast.error("Invalid API key format. Must be 20-60 alphanumeric characters.")
            return
        }

        setIsLoading(true)

        // Create default refresh schedule
        const refreshSchedule: RefreshSchedule = {
            default_refresh_rate: 60,
            time_ranges: []
        }

        const deviceToAdd = {
            ...newDevice,
            refresh_schedule: refreshSchedule,
            battery_voltage: null,
            firmware_version: null,
            rssi: null
        }

        const result = await addDevice(deviceToAdd)
        setIsLoading(false)

        if (result.success) {
            toast.success("Device added successfully")
            setIsAddDeviceDialogOpen(false)
            // Reset form
            setNewDevice({
                name: "",
                friendly_id: "",
                mac_address: "",
                api_key: "",
                screen: "simple-text",
                timezone: "Europe/London"
            })
            // Refresh devices list
            const devicesData = await fetchAllDevices()
            setDevices(devicesData)
        } else {
            toast.error(`Failed to add device: ${result.error}`)
        }
    }

    // Handle deleting a device
    const handleDeleteDeviceById = async (id: number) => {
        if (!confirm("Are you sure you want to delete this device? This will also delete all associated logs.")) {
            return
        }

        setIsLoading(true)
        const result = await deleteDevice(id)
        setIsLoading(false)

        if (result.success) {
            toast.success("Device deleted successfully")
            // Refresh devices list
            const devicesData = await fetchAllDevices()
            setDevices(devicesData)
        } else {
            toast.error(`Failed to delete device: ${result.error}`)
        }
    }

    // Handle input change for new device form
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setNewDevice(prev => ({
            ...prev,
            [name]: value
        }))
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6">
            <div className="mb-6">
                <h2 className="mt-10 scroll-m-20 pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">Maintenance</h2>
                <p className="text-muted-foreground">
                    This page provides maintenance tools for managing the database and devices.</p>
            </div>

            <Tabs defaultValue="database">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="database">Database Maintenance</TabsTrigger>
                    <TabsTrigger value="devices">Device Management</TabsTrigger>
                </TabsList>

                <TabsContent value="database" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Database Operations</CardTitle>
                            <CardDescription>
                                Perform maintenance operations on the database.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Initialize Database</CardTitle>
                                        <CardDescription>
                                            Create database schema and optionally add a test device.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardFooter className="flex flex-col space-y-2">
                                        <Dialog open={isInitDbDialogOpen} onOpenChange={setIsInitDbDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button className="w-full">
                                                    Initialize Database with Device
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[425px]">
                                                <DialogHeader>
                                                    <DialogTitle>Initialize Database</DialogTitle>
                                                    <DialogDescription>
                                                        Create database schema and add a test device with the specified details.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="device_name" className="text-right">
                                                            Device Name
                                                        </Label>
                                                        <Input
                                                            id="device_name"
                                                            name="device_name"
                                                            value={initDbParams.device_name}
                                                            onChange={handleInitDbInputChange}
                                                            className="col-span-3"
                                                            placeholder="Test Device"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="mac_address" className="text-right">
                                                            MAC Address
                                                        </Label>
                                                        <Input
                                                            id="mac_address"
                                                            name="mac_address"
                                                            value={initDbParams.mac_address}
                                                            onChange={handleInitDbInputChange}
                                                            className="col-span-3"
                                                            placeholder="AA:BB:CC:DD:EE:FF"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="friendly_id" className="text-right">
                                                            Friendly ID
                                                        </Label>
                                                        <div className="col-span-3 flex gap-2">
                                                            <Input
                                                                id="friendly_id"
                                                                name="friendly_id"
                                                                value={initDbParams.friendly_id}
                                                                onChange={handleInitDbInputChange}
                                                                className="flex-1"
                                                                placeholder="ABC123"
                                                            />
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={handleRegenerateFriendlyIdForInitDb}
                                                                title="Regenerate Friendly ID"
                                                            >
                                                                <RefreshCw className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="api_key" className="text-right">
                                                            API Key
                                                        </Label>
                                                        <div className="col-span-3 flex gap-2">
                                                            <Input
                                                                id="api_key"
                                                                name="api_key"
                                                                value={initDbParams.api_key}
                                                                onChange={handleInitDbInputChange}
                                                                className="flex-1"
                                                                placeholder="abcdef123456"
                                                            />
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={handleRegenerateApiKeyForInitDb}
                                                                title="Regenerate API Key"
                                                            >
                                                                <RefreshCw className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="timezone">Timezone</Label>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    role="combobox"
                                                                    className="w-full justify-between col-span-3"
                                                                >
                                                                    {initDbParams.timezone
                                                                        ? formatTimezone(initDbParams.timezone)
                                                                        : "Select timezone..."}
                                                                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-full p-0">
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
                                                                                                    handleInitDbInputChange({ target: { name: "timezone", value: timezone.value } } as React.ChangeEvent<HTMLInputElement>);
                                                                                                }}
                                                                                                className="cursor-pointer"
                                                                                            >
                                                                                                <span className={cn(
                                                                                                    "mr-2",
                                                                                                    initDbParams.timezone === timezone.value ? "font-medium" : ""
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
                                                </div>
                                                <DialogFooter>
                                                    <Button
                                                        type="submit"
                                                        onClick={handleInitializeDatabase}
                                                        disabled={isLoading}
                                                    >
                                                        {isLoading ? (
                                                            <>
                                                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                                Initializing...
                                                            </>
                                                        ) : "Initialize Database"}
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                        <Button 
                                            className="w-full" 
                                            variant="outline" 
                                            asChild
                                        >
                                            <Link href="/maintenance/init/">
                                                Initialize Database Only
                                            </Link>
                                        </Button>
                                    </CardFooter>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Fix Database Issues</CardTitle>
                                        <CardDescription>
                                            Replace null values with appropriate defaults.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardFooter>
                                        <Button
                                            onClick={handleFixDatabaseIssues}
                                            disabled={isLoading}
                                            className="w-full"
                                            variant="outline"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                    Fixing...
                                                </>
                                            ) : "Fix Database Issues"}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Log Management</CardTitle>
                            <CardDescription>
                                Delete logs from the database.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Delete System Logs</CardTitle>
                                        <CardDescription>
                                            Delete all system logs from the database.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardFooter>
                                        <Button
                                            onClick={handleDeleteAllSystemLogs}
                                            disabled={isLoading}
                                            className="w-full"
                                            variant="destructive"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                    Deleting...
                                                </>
                                            ) : "Delete All System Logs"}
                                        </Button>
                                    </CardFooter>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Delete Device Logs</CardTitle>
                                        <CardDescription>
                                            Delete all device logs from the database.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardFooter>
                                        <Button
                                            onClick={handleDeleteAllDeviceLogs}
                                            disabled={isLoading}
                                            className="w-full"
                                            variant="destructive"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                    Deleting...
                                                </>
                                            ) : "Delete All Device Logs"}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="devices" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Device Management</CardTitle>
                                <CardDescription>
                                    Add, edit, or delete devices.
                                </CardDescription>
                            </div>
                            <Dialog open={isAddDeviceDialogOpen} onOpenChange={setIsAddDeviceDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>Add Device</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Add New Device</DialogTitle>
                                        <DialogDescription>
                                            Create a new device with the specified details.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="name" className="text-right">
                                                Name
                                            </Label>
                                            <Input
                                                id="name"
                                                name="name"
                                                value={newDevice.name}
                                                onChange={handleInputChange}
                                                className="col-span-3"
                                                placeholder="My Device"
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="mac_address" className="text-right">
                                                MAC Address
                                            </Label>
                                            <Input
                                                id="mac_address"
                                                name="mac_address"
                                                value={newDevice.mac_address}
                                                onChange={handleMacAddressChange}
                                                className="col-span-3"
                                                placeholder="00:1A:2B:3C:4D:5E"
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="friendly_id" className="text-right">
                                                Friendly ID
                                            </Label>
                                            <div className="col-span-3 flex gap-2">
                                                <Input
                                                    id="friendly_id"
                                                    name="friendly_id"
                                                    value={newDevice.friendly_id}
                                                    onChange={handleInputChange}
                                                    className="flex-1"
                                                    placeholder="ABC123"
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={handleRegenerateFriendlyId}
                                                    title="Regenerate Friendly ID"
                                                >
                                                    <RefreshCw className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="api_key" className="text-right">
                                                API Key
                                            </Label>
                                            <div className="col-span-3 flex gap-2">
                                                <Input
                                                    id="api_key"
                                                    name="api_key"
                                                    value={newDevice.api_key}
                                                    onChange={handleInputChange}
                                                    className="flex-1"
                                                    placeholder="abcdef123456"
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={handleRegenerateApiKey}
                                                    title="Regenerate API Key"
                                                >
                                                    <RefreshCw className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="screen" className="text-right">
                                                Screen
                                            </Label>
                                            <Input
                                                id="screen"
                                                name="screen"
                                                value={newDevice.screen}
                                                onChange={handleInputChange}
                                                className="col-span-3"
                                                placeholder="simple-text"
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="timezone" className="text-right">
                                                Timezone
                                            </Label>
                                            <Input
                                                id="timezone"
                                                name="timezone"
                                                value={newDevice.timezone}
                                                onChange={handleInputChange}
                                                className="col-span-3"
                                                placeholder="Europe/London"
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" onClick={handleAddDevice} disabled={isLoading}>
                                            {isLoading ? (
                                                <>
                                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                    Adding...
                                                </>
                                            ) : "Add Device"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            {devices.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">No devices found.</p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Click the &quot;Add Device&quot; button to create a new device.
                                    </p>
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Friendly ID</TableHead>
                                                <TableHead>MAC Address</TableHead>
                                                <TableHead>Last Update</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {devices.map((device) => (
                                                <TableRow key={device.id}>
                                                    <TableCell className="font-medium">{device.name}</TableCell>
                                                    <TableCell>{device.friendly_id}</TableCell>
                                                    <TableCell>{device.mac_address}</TableCell>
                                                    <TableCell>
                                                        {device.last_update_time ? (
                                                            new Date(device.last_update_time).toLocaleString()
                                                        ) : (
                                                            <Badge variant="outline">Never</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleDeleteDeviceById(device.id)}
                                                            disabled={isLoading}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
