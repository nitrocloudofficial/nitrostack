"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Factory,
  Lightbulb,
  LayoutDashboard,
  Settings,
  Network,
  Bot,
  Wrench,
  Activity,
  FileCheck2
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"

export function CommandMenu() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem onSelect={() => runCommand(() => router.push("/factories"))}>
            <Factory className="mr-2 h-4 w-4" />
            <span>Search Factories</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/products"))}>
            <Lightbulb className="mr-2 h-4 w-4" />
            <span>Search Products</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Overview</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/ecosystem"))}>
            <Network className="mr-2 h-4 w-4" />
            <span>Ecosystem</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/agents"))}>
            <Bot className="mr-2 h-4 w-4" />
            <span>AI Agents</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/compliance"))}>
            <FileCheck2 className="mr-2 h-4 w-4" />
            <span>Compliance Reports</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/monitoring"))}>
            <Activity className="mr-2 h-4 w-4" />
            <span>System Monitoring</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => runCommand(() => router.push("/settings/profile"))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Profile Settings</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/tools"))}>
            <Wrench className="mr-2 h-4 w-4" />
            <span>Tools Explorer</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
