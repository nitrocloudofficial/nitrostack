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

const signupSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  password: z.string().min(8),
})

export async function POST(request: NextRequest) {
  let emailForLog = "unknown";

  try {
    const json = await request.json();
    emailForLog = typeof json.email === "string" ? json.email : "unknown";

    const rateLimit = consumeRateLimit({
      key: `auth-signup:${getRequestIdentifier(request)}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    })
    const rateLimitHeaders = buildRateLimitHeaders(rateLimit)

    if (!rateLimit.allowed) {
      logger.warn("Rate limit exceeded for signup", { ip: getRequestIdentifier(request) });
      return NextResponse.json(
        { error: "Too many account creation attempts. Please wait and try again." },
        { status: 429, headers: rateLimitHeaders }
      )
    }

    const payload = signupSchema.parse(json)

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase auth is not configured." }, { status: 503, headers: rateLimitHeaders })
    }

    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase client is unavailable." }, { status: 503, headers: rateLimitHeaders })
    }

    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.fullName,
        },
      },
    })

    if (error) {
      logger.warn("Signup failed", { email: emailForLog, reason: error.message });
      // GENERIC ERROR: Prevent email enumeration. Supabase might return "User already registered"
      // We return a generic message if it fails. 
      return NextResponse.json({ error: "Unable to create account. Ensure requirements are met and try again." }, { status: 400 })
    }

    if (data.session) {
      setAuthCookies(data.session)
    }

    logger.info("Successful signup", { userId: data.user?.id, email: emailForLog });

    return NextResponse.json({
      user: data.user ? toAuthUserSummary(data.user) : null,
      requiresEmailVerification: !data.session,
    }, { headers: rateLimitHeaders })
  } catch (error: unknown) {
    logger.error("Signup route error", error, { email: emailForLog });
    // GENERIC ERROR: Don't leak Zod validation internals
    return NextResponse.json({ error: "Invalid registration payload." }, { status: 400 })
  }
}
