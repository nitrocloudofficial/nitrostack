import { NextRequest, NextResponse } from "next/server"
import { factoryRegistrationSchema } from "@/lib/validations"
import {
  buildRateLimitHeaders,
  consumeRateLimit,
  getRequestIdentifier,
} from "@/lib/server/rate-limit"
import { getSyncedEngine, persistFactory } from "@/lib/server/synced-engine"
import { guardRoute } from "@/lib/server/auth"
import { logger } from "@/lib/server/logger"

export async function GET() {
  await guardRoute()
  const engine = await getSyncedEngine()
  const factories = engine.getFactories()
  return NextResponse.json({ factories })
}

export async function POST(request: NextRequest) {
  const rateLimit = consumeRateLimit({
    key: `factories:${getRequestIdentifier(request)}`,
    limit: 15,
    windowMs: 10 * 60 * 1000,
  })
  const rateLimitHeaders = buildRateLimitHeaders(rateLimit)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many factory registration attempts. Please try again later." },
      { status: 429, headers: rateLimitHeaders }
    )
  }

  try {
    await guardRoute()
    const payload = factoryRegistrationSchema.parse(await request.json())
    const engine = await getSyncedEngine()
    const factory = engine.registerFactory(payload)

    await persistFactory(factory)

    logger.info("Factory registered successfully", { factoryId: factory.id, reqId: getRequestIdentifier(request) });
    return NextResponse.json({ factory }, { status: 201, headers: rateLimitHeaders })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid request body"
    logger.warn("Factory registration failed", { error: message, reqId: getRequestIdentifier(request) });
    return NextResponse.json({ error: message }, { status: 400, headers: rateLimitHeaders })
  }
}
