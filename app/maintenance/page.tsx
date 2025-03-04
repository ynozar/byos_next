"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { initializeDatabase, deleteAllSystemLogs, deleteAllDeviceLogs, addDevice, deleteDevice, fixDatabaseIssues, fetchAllDevices } from "@/app/actions/maintenance"
import type { Device, RefreshSchedule } from "@/lib/supabase/types"

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
    timezone: "UTC"
  })

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

  // Handle initializing the database
  const handleInitializeDatabase = async () => {
    if (!confirm("Are you sure you want to initialize the database with a test device? This will create a new device with default values.")) {
      return
    }
    
    setIsLoading(true)
    const result = await initializeDatabase()
    setIsLoading(false)
    
    if (result.success) {
      toast.success("Database initialized successfully")
      // Refresh devices list
      const devicesData = await fetchAllDevices()
      setDevices(devicesData)
    } else {
      toast.error(`Failed to initialize database: ${result.error}`)
    }
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

  // Handle adding a new device
  const handleAddDevice = async () => {
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
        timezone: "UTC"
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
        <h2 className="text-xl font-semibold">Maintenance</h2>
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
                      Create a test device with default values.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button 
                      onClick={handleInitializeDatabase} 
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? "Initializing..." : "Initialize Database"}
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
                      {isLoading ? "Fixing..." : "Fix Database Issues"}
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
                      {isLoading ? "Deleting..." : "Delete All System Logs"}
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
                      {isLoading ? "Deleting..." : "Delete All Device Logs"}
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
                      <Label htmlFor="friendly_id" className="text-right">
                        Friendly ID
                      </Label>
                      <Input
                        id="friendly_id"
                        name="friendly_id"
                        value={newDevice.friendly_id}
                        onChange={handleInputChange}
                        className="col-span-3"
                        placeholder="device-001"
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
                        onChange={handleInputChange}
                        className="col-span-3"
                        placeholder="00:1A:2B:3C:4D:5E"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="api_key" className="text-right">
                        API Key
                      </Label>
                      <Input
                        id="api_key"
                        name="api_key"
                        value={newDevice.api_key}
                        onChange={handleInputChange}
                        className="col-span-3"
                        placeholder="abcdef123456"
                      />
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
                        placeholder="UTC"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleAddDevice} disabled={isLoading}>
                      {isLoading ? "Adding..." : "Add Device"}
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
