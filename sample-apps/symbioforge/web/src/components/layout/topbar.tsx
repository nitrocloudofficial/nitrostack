"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Bell, Search, Command, CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { AuthSessionResponse } from "@/lib/auth"

export function Topbar() {
  const [session, setSession] = useState<AuthSessionResponse | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: AuthSessionResponse) => setSession(payload))
      .catch(() => setSession({ authEnabled: false, authRequired: false, user: null }))
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      window.location.href = "/login"
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="h-16 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center flex-1">
        {/* Command Palette Trigger */}
        <div className="relative w-96 hidden md:flex items-center group">
          <Search className="absolute left-3 h-4 w-4 text-zinc-400 group-hover:text-zinc-300 transition-colors" />
          <Input 
            type="text" 
            placeholder="Search factories, products, pages..." 
            className="pl-10 pr-12 bg-zinc-900 border-zinc-800 text-sm focus-visible:ring-1 focus-visible:ring-emerald-500 rounded-full w-full placeholder:text-zinc-500 cursor-text"
            readOnly
          />
          <div className="absolute right-3 flex items-center space-x-1">
            <kbd className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-400 opacity-100">
              <Command className="h-3 w-3" />
            </kbd>
            <kbd className="inline-flex items-center rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-400 opacity-100">
              K
            </kbd>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white rounded-full relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-emerald-500 border-2 border-zinc-950"></span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-0" align="end">
            <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <span className="font-semibold text-sm text-zinc-200">Notifications</span>
              <span className="text-xs text-emerald-400 cursor-pointer">Mark all read</span>
            </div>
            <div className="max-h-[300px] overflow-auto flex flex-col">
              <div className="px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-900/50 cursor-pointer flex gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-zinc-300 mb-0.5">Compliance Deadline</p>
                  <p className="text-xs text-zinc-500">2 factories have pending SPCB Form V filings due in 7 days.</p>
                </div>
              </div>
              <div className="px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-900/50 cursor-pointer flex gap-3">
                <Lightbulb className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-zinc-300 mb-0.5">New Opportunity</p>
                  <p className="text-xs text-zinc-500">Inventor agent proposed a new product concept: EcoBoard-7.</p>
                </div>
              </div>
              <div className="px-4 py-3 hover:bg-zinc-900/50 cursor-pointer flex gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-zinc-300 mb-0.5">Report Generated</p>
                  <p className="text-xs text-zinc-500">Clerk successfully generated compliance PDF for Lakshmi Textiles.</p>
                </div>
              </div>
            </div>
            <div className="p-2 border-t border-zinc-800 text-center">
              <span className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer">View all notifications</span>
            </div>
          </PopoverContent>
        </Popover>

        {session?.user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-full border border-zinc-800 bg-zinc-900/60 px-2 py-1 pr-3 text-left transition-colors hover:border-zinc-700">
                <Avatar className="h-8 w-8 border border-zinc-700">
                  <AvatarFallback className="bg-emerald-500/20 text-xs font-semibold text-emerald-300">
                    {session.user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-zinc-200">{session.user.fullName}</p>
                  <p className="text-xs text-zinc-500">{session.user.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 border-zinc-800 bg-zinc-950 text-zinc-100">
              <DropdownMenuLabel>
                <div className="space-y-0.5">
                  <p className="font-medium">{session.user.fullName}</p>
                  <p className="text-xs text-zinc-500">{session.user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile">Profile settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-300 focus:bg-red-500/10 focus:text-red-200"
                disabled={loggingOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {loggingOut ? "Signing out..." : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : session?.authEnabled ? (
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="text-zinc-300 hover:text-white">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-500">
              <Link href="/signup">Create account</Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5">
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-300">
              Demo
            </span>
            <Avatar className="h-7 w-7 border border-zinc-700">
              <AvatarFallback className="bg-zinc-800 text-xs text-zinc-200">DM</AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    </div>
  )
}
