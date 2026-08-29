import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { setAuthCookies, toAuthUserSummary } from "@/lib/server/auth"
import {
  buildRateLimitHeaders,
  consumeRateLimit,
  getRequestIdentifier,
} from "@/lib/server/rate-limit"
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/server/supabase"
import { logger } from "@/lib/server/logger"

const loginSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  password: z.string().min(8),
})

export async function POST(request: NextRequest) {
  let emailForLog = "unknown";
  
  try {
    const json = await request.json();
    emailForLog = typeof json.email === "string" ? json.email : "unknown";
    
    // Include email in rate limit key to prevent distributed brute-force on a single account
    const rateLimit = consumeRateLimit({
      key: `auth-login:${emailForLog}:${getRequestIdentifier(request)}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    })
    const rateLimitHeaders = buildRateLimitHeaders(rateLimit)

    if (!rateLimit.allowed) {
      logger.warn("Rate limit exceeded for login", { email: emailForLog, ip: getRequestIdentifier(request) });
      return NextResponse.json(
        { error: "Too many sign-in attempts. Please wait and try again." },
        { status: 429, headers: rateLimitHeaders }
      )
    }

    const payload = loginSchema.parse(json)

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase auth is not configured." }, { status: 503, headers: rateLimitHeaders })
    }

    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase client is unavailable." }, { status: 503, headers: rateLimitHeaders })
    }

    const { data, error } = await supabase.auth.signInWithPassword(payload)

    if (error || !data.session || !data.user) {
      logger.warn("Failed login attempt", { email: emailForLog, ip: getRequestIdentifier(request), reason: error?.message });
      // GENERIC ERROR: Never reveal whether the email exists or the password is wrong
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401, headers: rateLimitHeaders }
      )
    }

    setAuthCookies(data.session)
    logger.info("Successful login", { userId: data.user.id, email: emailForLog });

    return NextResponse.json({
      user: toAuthUserSummary(data.user),
      requiresEmailVerification: false,
    }, { headers: rateLimitHeaders })
  } catch (error: unknown) {
    logger.error("Login route error", error, { email: emailForLog, ip: getRequestIdentifier(request) });
    // GENERIC ERROR: Don't leak internal Zod or server errors
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 })
  }
}
