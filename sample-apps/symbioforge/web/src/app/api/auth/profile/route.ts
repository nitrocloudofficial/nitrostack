import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  getCurrentUser,
  requireAuthenticatedUser,
  setSupabaseSessionFromCookies,
  toAuthUserSummary,
} from "@/lib/server/auth"
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/server/supabase"

const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(120),
})

export async function GET() {
  const { user } = await getCurrentUser({ refreshIfNeeded: true })
  return NextResponse.json({ user: user ? toAuthUserSummary(user) : null })
}

export async function PATCH(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase auth is not configured." }, { status: 503 })
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ error: "Supabase client is unavailable." }, { status: 503 })
  }

  try {
    await requireAuthenticatedUser()
    const payload = updateProfileSchema.parse(await request.json())
    const sessionBound = await setSupabaseSessionFromCookies()

    if (!sessionBound) {
      return NextResponse.json({ error: "Session is unavailable." }, { status: 401 })
    }

    const { data, error } = await supabase.auth.updateUser({
      data: { full_name: payload.fullName },
    })

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message ?? "Unable to update profile." },
        { status: 400 }
      )
    }

    return NextResponse.json({ user: toAuthUserSummary(data.user) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to update profile."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
