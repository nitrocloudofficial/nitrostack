import { NextResponse } from "next/server"
import { getCurrentUser, isAuthRequired, toAuthUserSummary } from "@/lib/server/auth"
import { isSupabaseConfigured } from "@/lib/server/supabase"

export async function GET() {
  const { user } = await getCurrentUser({ refreshIfNeeded: true })

  return NextResponse.json(
    {
      authEnabled: isSupabaseConfigured(),
      authRequired: isAuthRequired(),
      user: user ? toAuthUserSummary(user) : null,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}
