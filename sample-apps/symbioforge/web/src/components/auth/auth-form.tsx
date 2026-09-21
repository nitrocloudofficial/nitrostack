"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Loader2, LockKeyhole, Mail, User2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type AuthMode = "login" | "signup"

type FormState = {
  fullName: string
  email: string
  password: string
}

const INITIAL_STATE: FormState = {
  fullName: "",
  email: "",
  password: "",
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const nextPath = searchParams.get("next") || "/"
  const isSignup = mode === "signup"

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSignup
            ? form
            : {
                email: form.email,
                password: form.password,
              }
        ),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || "Authentication failed.")
      }

      if (payload.requiresEmailVerification) {
        setMessage("Check your inbox to verify your email, then sign in.")
        return
      }

      router.replace(nextPath)
      router.refresh()
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-zinc-800 bg-zinc-950/80 shadow-2xl shadow-zinc-950/30">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
          {isSignup ? <User2 className="h-6 w-6" /> : <LockKeyhole className="h-6 w-6" />}
        </div>
        <div>
          <CardTitle className="text-2xl text-zinc-100">
            {isSignup ? "Create your account" : "Sign in to SymBioForge"}
          </CardTitle>
          <CardDescription className="mt-1 text-zinc-500">
            {isSignup
              ? "Use your email to create a production-ready workspace login."
              : "Use your email and password to access the operations dashboard."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-300">Full name</span>
              <Input
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                className="border-zinc-800 bg-zinc-900/70"
                placeholder="Plant operations lead"
                required
              />
            </label>
          )}

          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-300">Email</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="border-zinc-800 bg-zinc-900/70 pl-10"
                placeholder="you@company.com"
                required
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-300">Password</span>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="border-zinc-800 bg-zinc-900/70 pl-10"
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </div>
          </label>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              {message}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-500"
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSignup ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          {isSignup ? "Already have an account?" : "Need an account?"}{" "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="font-medium text-emerald-400 hover:text-emerald-300"
          >
            {isSignup ? "Sign in" : "Create one"}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
