import type { H3Event } from 'h3'
import * as process from 'node:process'
import { createError, getRequestIP } from 'h3'
import { getRedisClient } from '~~/server/utils/redis'
import type { RedisClient } from '~~/server/utils/redis'

interface RateLimitBucket {
  count: number
  resetAt: number
}

interface RateLimitResult extends RateLimitBucket {
  allowed: boolean
  remaining: number
}

interface CooldownResult {
  active: boolean
  resetAt: number
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
const PASSWORD_RESET_WINDOW_MS = readPositiveInt(
  process.env.AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
  60_000,
)
const PASSWORD_RESET_MAX = readPositiveInt(
  process.env.AUTH_PASSWORD_RESET_RATE_LIMIT_MAX,
  3,
)
const PASSWORD_RESET_EMAIL_COOLDOWN_MS = readPositiveInt(
  process.env.AUTH_PASSWORD_RESET_EMAIL_COOLDOWN_MS,
  300_000,
)

const buckets = new Map<string, RateLimitBucket>()
const cooldowns = new Map<string, number>()
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
  for (const [key, resetAt] of cooldowns) {
    if (resetAt <= now) {
      cooldowns.delete(key)
    }
  }
}

function consumeMemoryRateLimit(key: string, max: number, windowMs: number, now: number): RateLimitResult {
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

async function consumeRedisRateLimit(
  client: RedisClient,
  key: string,
  max: number,
  windowMs: number,
  now: number,
): Promise<RateLimitResult> {
  const count = await client.incr(key)
  if (count === 1) {
    await client.pExpire(key, windowMs)
  }

  let ttl = await client.pTTL(key)
  if (ttl < 0) {
    await client.pExpire(key, windowMs)
    ttl = windowMs
  }

  return {
    count,
    resetAt: now + ttl,
    allowed: count <= max,
    remaining: Math.max(max - count, 0),
  }
}

async function consumeRateLimit(
  key: string,
  max: number,
  windowMs: number,
  now: number,
): Promise<RateLimitResult> {
  const client = await getRedisClient()
  if (client) {
    try {
      return await consumeRedisRateLimit(client, key, max, windowMs, now)
    }
    catch {
      return consumeMemoryRateLimit(key, max, windowMs, now)
    }
  }
  return consumeMemoryRateLimit(key, max, windowMs, now)
}

function reserveMemoryCooldown(key: string, cooldownMs: number, now: number): CooldownResult {
  const existingResetAt = cooldowns.get(key)
  if (existingResetAt && existingResetAt > now) {
    return {
      active: true,
      resetAt: existingResetAt,
    }
  }

  const resetAt = now + cooldownMs
  cooldowns.set(key, resetAt)
  return {
    active: false,
    resetAt,
  }
}

async function reserveRedisCooldown(
  client: RedisClient,
  key: string,
  cooldownMs: number,
  now: number,
): Promise<CooldownResult> {
  const result = await client.set(key, String(now), {
    NX: true,
    PX: cooldownMs,
  })

  if (result === 'OK') {
    return {
      active: false,
      resetAt: now + cooldownMs,
    }
  }

  let ttl = await client.pTTL(key)
  if (ttl < 0) {
    await client.pExpire(key, cooldownMs)
    ttl = cooldownMs
  }

  return {
    active: true,
    resetAt: now + ttl,
  }
}

async function reserveCooldown(
  key: string,
  cooldownMs: number,
  now: number,
): Promise<CooldownResult> {
  const client = await getRedisClient()
  if (client) {
    try {
      return await reserveRedisCooldown(client, key, cooldownMs, now)
    }
    catch {
      return reserveMemoryCooldown(key, cooldownMs, now)
    }
  }
  return reserveMemoryCooldown(key, cooldownMs, now)
}

function throwRateLimitError(event: H3Event, retryAfter: number): never {
  event.node.res.setHeader('Retry-After', String(retryAfter))
  event.node.res.setHeader('X-Retry-After', String(retryAfter))
  throw createError({
    statusCode: 429,
    statusMessage: 'Too many requests. Please try again later.',
  })
}

export async function enforceSignInRateLimit(event: H3Event, identifier?: string): Promise<void> {
  const now = Date.now()
  cleanupExpired(now)

  const ip = getRequestIP(event) ?? 'unknown'
  const ipResult = await consumeRateLimit(
    `auth:sign-in:ip:${ip}`,
    SIGN_IN_MAX,
    SIGN_IN_WINDOW_MS,
    now,
  )

  const normalizedIdentifier = normalizeIdentifier(identifier)
  const identifierResult = normalizedIdentifier
    ? await consumeRateLimit(
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

  throwRateLimitError(event, retryAfter)
}

export async function enforcePasswordResetRateLimit(
  event: H3Event,
  email: string,
): Promise<{ emailCoolingDown: boolean }> {
  const now = Date.now()
  cleanupExpired(now)

  const ip = getRequestIP(event) ?? 'unknown'
  const ipResult = await consumeRateLimit(
    `auth:password-reset:ip:${ip}`,
    PASSWORD_RESET_MAX,
    PASSWORD_RESET_WINDOW_MS,
    now,
  )

  if (!ipResult.allowed) {
    const retryAfter = Math.max(Math.ceil((ipResult.resetAt - now) / 1000), 1)
    throwRateLimitError(event, retryAfter)
  }

  const normalizedEmail = normalizeIdentifier(email)
  if (!normalizedEmail) {
    return { emailCoolingDown: false }
  }

  const cooldown = await reserveCooldown(
    `auth:password-reset:email:${normalizedEmail}`,
    PASSWORD_RESET_EMAIL_COOLDOWN_MS,
    now,
  )

  return {
    emailCoolingDown: cooldown.active,
  }
}
