"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import type { AuthUser } from "@/lib/auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function ProfileSettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/auth/profile", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        setUser(payload.user ?? null)
        setFullName(payload.user?.fullName ?? "")
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        setError("Unable to load profile details.")
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || "Unable to update profile.")
      }

      setUser(payload.user)
      setFullName(payload.user.fullName)
      setMessage("Profile updated successfully.")
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update profile.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-950/50">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage the account identity used across the operations dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 border border-zinc-800">
              <AvatarFallback className="bg-zinc-800 text-lg text-zinc-100">
                {user?.initials ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-100">{user?.fullName ?? "No active session"}</p>
              <p className="text-sm text-zinc-500">{user?.email ?? "Sign in to manage a real user profile."}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-zinc-300">Full name</label>
              <Input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="border-zinc-800 bg-zinc-900/50"
                disabled={!user}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Email address</label>
            <Input value={user?.email ?? ""} className="border-zinc-800 bg-zinc-900/50" disabled />
          </div>

          {error ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              {message}
            </div>
          ) : null}

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={!user || saving || fullName.trim().length < 2}
              className="bg-emerald-600 text-white hover:bg-emerald-500"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
