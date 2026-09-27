import "server-only"

type RateLimitOptions = {
  key: string
  limit: number
  windowMs: number
}

export type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

type Bucket = {
  count: number
  resetAt: number
}

const MAX_BUCKETS = 5000

declare global {
  // eslint-disable-next-line no-var
  var __symbioforgeRateLimitBuckets__: Map<string, Bucket> | undefined
}

const buckets = globalThis.__symbioforgeRateLimitBuckets__ ?? new Map<string, Bucket>()

if (!globalThis.__symbioforgeRateLimitBuckets__) {
  globalThis.__symbioforgeRateLimitBuckets__ = buckets
}

function pruneBuckets(now: number) {
  for (const [key, bucket] of Array.from(buckets.entries())) {
    if (bucket.resetAt <= now) {
      buckets.delete(key)
    }
  }

  if (buckets.size <= MAX_BUCKETS) {
    return
  }

  const entries = Array.from(buckets.entries()).sort((a, b) => a[1].resetAt - b[1].resetAt)
  for (const [key] of entries.slice(0, buckets.size - MAX_BUCKETS)) {
    buckets.delete(key)
  }
}

export function getRequestIdentifier(request: { headers: Headers }): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = request.headers.get("x-real-ip")?.trim()
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim()

  return forwardedFor || realIp || cloudflareIp || "anonymous"
}

export function consumeRateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  pruneBuckets(now)

  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs
    buckets.set(key, { count: 1, resetAt })
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
    }
  }

  existing.count += 1

  return {
    allowed: existing.count <= limit,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  }
}

export function buildRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    "Retry-After": String(result.retryAfterSeconds),
  }
}
