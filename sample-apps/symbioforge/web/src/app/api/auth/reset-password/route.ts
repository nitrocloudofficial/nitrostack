import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  buildRateLimitHeaders,
  consumeRateLimit,
  getRequestIdentifier,
} from "@/lib/server/rate-limit"
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/server/supabase"
import { logger } from "@/lib/server/logger"

const resetSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
})

export async function POST(request: NextRequest) {
  let emailForLog = "unknown";

  try {
    const json = await request.json();
    emailForLog = typeof json.email === "string" ? json.email : "unknown";

    // Strict rate limit for password resets
    const rateLimit = consumeRateLimit({
      key: `auth-reset:${emailForLog}:${getRequestIdentifier(request)}`,
      limit: 3,
      windowMs: 60 * 60 * 1000,
    })
    const rateLimitHeaders = buildRateLimitHeaders(rateLimit)

    if (!rateLimit.allowed) {
      logger.warn("Rate limit exceeded for password reset", { email: emailForLog, ip: getRequestIdentifier(request) });
      return NextResponse.json(
        { error: "Too many reset attempts. Please wait and try again." },
        { status: 429, headers: rateLimitHeaders }
      )
    }

    const payload = resetSchema.parse(json)

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase auth is not configured." }, { status: 503, headers: rateLimitHeaders })
    }

    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase client is unavailable." }, { status: 503, headers: rateLimitHeaders })
    }

    const { error } = await supabase.auth.resetPasswordForEmail(payload.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/profile`,
    })

    if (error) {
      logger.warn("Password reset failed", { email: emailForLog, reason: error.message });
      // Proceed to generic success anyway
    } else {
      logger.info("Password reset requested", { email: emailForLog });
    }

    // GENERIC RESPONSE: Don't reveal if the email exists or not
    return NextResponse.json(
      { message: "If this email is registered, a password reset link has been sent." },
      { headers: rateLimitHeaders }
    )
  } catch (error: unknown) {
    logger.error("Password reset route error", error, { email: emailForLog });
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 })
  }
}
