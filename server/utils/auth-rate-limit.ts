import * as process from 'node:process'
import { createError, getRequestIP, setHeader } from 'h3'
import type { H3Event } from 'h3'

interface RateLimitBucket {
  count: number
  resetAt: number
}

interface RateLimitResult extends RateLimitBucket {
  allowed: boolean
  remaining: number
}

const CLEANUP_INTERVAL_MS = 60_000
const SIGN_IN_WINDOW_MS = readPositiveInt(process.env.AUTH_SIGN_IN_RATE_LIMIT_WINDOW_MS, 10_000)
const SIGN_IN_MAX = readPositiveInt(process.env.AUTH_SIGN_IN_RATE_LIMIT_MAX, 3)
const IDENTIFIER_WINDOW_MS = readPositiveInt(
  process.env.AUTH_SIGN_IN_IDENTIFIER_RATE_LIMIT_WINDOW_MS,
  SIGN_IN_WINDOW_MS,
)
const IDENTIFIER_MAX = readPositiveInt(
  process.env.AUTH_SIGN_IN_IDENTIFIER_RATE_LIMIT_MAX,
  SIGN_IN_MAX,
)

const buckets = new Map<string, RateLimitBucket>()
let nextCleanupAt = Date.now() + CLEANUP_INTERVAL_MS

function readPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback
  }
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

function normalizeIdentifier(identifier: string | undefined): string | null {
  if (!identifier) {
    return null
  }
  const trimmed = identifier.trim().toLowerCase()
  return trimmed.length > 0 ? trimmed : null
}

function cleanupExpired(now: number): void {
  if (now < nextCleanupAt) {
    return
  }
  nextCleanupAt = now + CLEANUP_INTERVAL_MS
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key)
    }
  }
}

function consumeRateLimit(key: string, max: number, windowMs: number, now: number): RateLimitResult {
  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    const nextBucket = { count: 1, resetAt: now + windowMs }
    buckets.set(key, nextBucket)
    return {
      ...nextBucket,
      allowed: true,
      remaining: Math.max(max - 1, 0),
    }
  }

  existing.count += 1
  buckets.set(key, existing)
  const remaining = Math.max(max - existing.count, 0)
  return {
    ...existing,
    allowed: existing.count <= max,
    remaining,
  }
}

export function enforceSignInRateLimit(event: H3Event, identifier?: string): void {
  const now = Date.now()
  cleanupExpired(now)

  const ip = getRequestIP(event) ?? 'unknown'
  const ipResult = consumeRateLimit(`auth:sign-in:ip:${ip}`, SIGN_IN_MAX, SIGN_IN_WINDOW_MS, now)

  const normalizedIdentifier = normalizeIdentifier(identifier)
  const identifierResult = normalizedIdentifier
    ? consumeRateLimit(
        `auth:sign-in:id:${normalizedIdentifier}`,
        IDENTIFIER_MAX,
        IDENTIFIER_WINDOW_MS,
        now,
      )
    : null

  if (ipResult.allowed && (!identifierResult || identifierResult.allowed)) {
    return
  }

  const ipRetryAfter = ipResult.allowed ? 0 : Math.ceil((ipResult.resetAt - now) / 1000)
  const identifierRetryAfter = identifierResult && !identifierResult.allowed
    ? Math.ceil((identifierResult.resetAt - now) / 1000)
    : 0
  const retryAfter = Math.max(ipRetryAfter, identifierRetryAfter, 1)

  setHeader(event, 'Retry-After', String(retryAfter))
  setHeader(event, 'X-Retry-After', String(retryAfter))
  throw createError({
    statusCode: 429,
    statusMessage: 'Too many requests. Please try again later.',
  })
}
