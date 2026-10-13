import { NextRequest, NextResponse } from "next/server"
import { swarmActionSchema } from "@/lib/validations"
import {
  buildRateLimitHeaders,
  consumeRateLimit,
  getRequestIdentifier,
} from "@/lib/server/rate-limit"
import { getSyncedEngine } from "@/lib/server/synced-engine"
import { guardRoute } from "@/lib/server/auth"

export async function POST(request: NextRequest) {
  const rateLimit = consumeRateLimit({
    key: `swarm:${getRequestIdentifier(request)}`,
    limit: 30,
    windowMs: 10 * 60 * 1000,
  })
  const rateLimitHeaders = buildRateLimitHeaders(rateLimit)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many swarm control requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders }
    )
  }

  try {
    await guardRoute()
    const { action } = swarmActionSchema.parse(await request.json())
    const engine = await getSyncedEngine()

    if (action === "start") {
      engine.setSwarmActive(true)
      return NextResponse.json({ status: "started", swarmActive: true }, { headers: rateLimitHeaders })
    }

    if (action === "stop") {
      engine.setSwarmActive(false)
      return NextResponse.json({ status: "stopped", swarmActive: false }, { headers: rateLimitHeaders })
    }

    engine.resetState()
    return NextResponse.json({ status: "reset", swarmActive: false }, { headers: rateLimitHeaders })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid request body"
    return NextResponse.json({ error: message }, { status: 400, headers: rateLimitHeaders })
  }
}
