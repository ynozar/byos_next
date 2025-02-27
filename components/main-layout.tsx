"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronRight, Github, Menu, Monitor, Moon, Server, Sun, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { StatusIndicator } from "@/components/ui/status-indicator"
import type { Device } from "@/lib/supabase/types"
import { getDeviceStatus } from "@/utils/helpers"
import Link from "next/link"

interface MainLayoutProps {
  children: React.ReactNode
  devices: Device[]
}

export default function MainLayout({ children, devices }: MainLayoutProps) {
  const pathname = usePathname()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isDevicesOpen, setIsDevicesOpen] = useState(true)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)

  // Determine if a path is active
  const isActivePath = (path: string) => pathname === path
  const isActiveDevicePath = (friendly_id: string) => pathname === `/device/${friendly_id}`

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle("dark")
  }

  // Check if dark mode is preferred
  useEffect(() => {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setIsDarkMode(true)
      document.documentElement.classList.add("dark")
    }
  }, [])

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        mainRef.current &&
        mainRef.current.contains(event.target as Node)
      ) {
        setIsSidebarOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isSidebarOpen])

  // Open devices section if a device page is active
  useEffect(() => {
    if (pathname.startsWith("/device/")) {
      setIsDevicesOpen(true)
    }
  }, [pathname])

  // Add status and type to devices
  const enhancedDevices = devices.map((device) => ({
    ...device,
    status: getDeviceStatus(device),
  }))

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? "dark" : ""}`}>
      <header className="border-b bg-background">
        <div className="flex h-14 items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 md:hidden"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">trmnl-byos-nextjs</h1>
          </div>
          <div className="ml-auto flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href="https://github.com/ghcpuman902/byos-nextjs" target="_blank" rel="noopener noreferrer">
                <Github className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <aside
          ref={sidebarRef}
          className={`${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } fixed inset-y-0 z-50 flex w-56 flex-col border-r bg-background transition-transform md:translate-x-0 md:relative`}
        >
          <div className="md:hidden flex justify-end p-2">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1">
            <nav className="p-2 space-y-1">
              <Button
                variant="ghost"
                className={`w-full justify-start text-sm h-9 ${isActivePath("/") ? "bg-muted" : ""}`}
                asChild
              >
                <Link href="/">
                  <Server className="mr-2 h-4 w-4" />
                  Overview
                </Link>
              </Button>

              <Collapsible open={isDevicesOpen} onOpenChange={setIsDevicesOpen} className="w-full">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-sm h-9">
                    <div className="flex items-center">
                      <Monitor className="mr-2 h-4 w-4" />
                      Devices
                    </div>
                    {isDevicesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 space-y-1">
                  {enhancedDevices.map((device) => (
                    <Button
                      key={device.id}
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-start text-sm h-8 ${isActiveDevicePath(device.friendly_id) ? "bg-muted" : ""}`}
                      asChild
                    >
                      <Link href={`/device/${device.friendly_id}`}>
                        <div className="flex items-center w-full">
                          <span className="truncate text-xs">{device.name}</span>
                          <StatusIndicator 
                            status={device.status as "online" | "offline"} 
                            size="sm" 
                            className="ml-1" 
                          />
                        </div>
                      </Link>
                    </Button>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              <Button
                variant="ghost"
                className={`w-full justify-start text-sm h-9 ${isActivePath("/system-logs") ? "bg-muted" : ""}`}
                asChild
              >
                <Link href="/system-logs">
                  <Server className="mr-2 h-4 w-4" />
                  System Log
                </Link>
              </Button>
            </nav>
          </div>
        </aside>
        <main ref={mainRef} className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}

