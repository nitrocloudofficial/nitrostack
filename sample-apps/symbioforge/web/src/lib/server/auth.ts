import "server-only"

import type { Session, User } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/server/supabase"

export const ACCESS_TOKEN_COOKIE = "sb-access-token"
export const REFRESH_TOKEN_COOKIE = "sb-refresh-token"

const COOKIE_PATH = "/"
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30

export type AuthUserSummary = {
  id: string
  email: string | null
  fullName: string
  initials: string
}

type AuthTokens = {
  accessToken: string | null
  refreshToken: string | null
}

function isProduction() {
  return process.env.NODE_ENV === "production"
}

function computeInitials(fullName: string, email: string | null): string {
  const source = fullName.trim() || email?.split("@")[0] || "User"
  const parts = source.split(/\s+/).filter(Boolean)
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("")
  return initials || "U"
}

export function isAuthRequired(): boolean {
  return process.env.AUTH_REQUIRED === "true"
}

export function toAuthUserSummary(user: User): AuthUserSummary {
  const fullName =
    typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()
        ? user.user_metadata.name.trim()
        : user.email?.split("@")[0] ?? "User"

  return {
    id: user.id,
    email: user.email ?? null,
    fullName,
    initials: computeInitials(fullName, user.email ?? null),
  }
}

function readTokens(): AuthTokens {
  const cookieStore = cookies()
  return {
    accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null,
    refreshToken: cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null,
  }
}

export function setAuthCookies(session: Session): void {
  const cookieStore = cookies()
  const accessMaxAge = Math.max(60, session.expires_in ?? 60 * 60)

  cookieStore.set(ACCESS_TOKEN_COOKIE, session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: COOKIE_PATH,
    maxAge: accessMaxAge,
  })

  cookieStore.set(REFRESH_TOKEN_COOKIE, session.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  })
}

export function clearAuthCookies(): void {
  const cookieStore = cookies()
  cookieStore.delete(ACCESS_TOKEN_COOKIE)
  cookieStore.delete(REFRESH_TOKEN_COOKIE)
}

export async function getCurrentUser(options?: {
  refreshIfNeeded?: boolean
}): Promise<{ user: User | null; session: Session | null }> {
  const supabase = getSupabaseServerClient()
  if (!supabase || !isSupabaseConfigured()) {
    return { user: null, session: null }
  }

  const { accessToken, refreshToken } = readTokens()

  if (accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken)
    if (!error && data.user) {
      return { user: data.user, session: null }
    }
  }

  if (options?.refreshIfNeeded && refreshToken) {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    })

    if (!error && data.session && data.user) {
      setAuthCookies(data.session)
      return { user: data.user, session: data.session }
    }
  }

  return { user: null, session: null }
}

export async function requireAuthenticatedUser(): Promise<User> {
  const { user } = await getCurrentUser({ refreshIfNeeded: true })
  if (!user) {
    throw new Error("Authentication required.")
  }
  return user
}

export async function guardRoute(): Promise<void> {
  if (!isAuthRequired() || !isSupabaseConfigured()) return
  await requireAuthenticatedUser()
}

export async function setSupabaseSessionFromCookies(): Promise<boolean> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return false

  const { accessToken, refreshToken } = readTokens()
  if (!accessToken || !refreshToken) return false

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  return !error
}
