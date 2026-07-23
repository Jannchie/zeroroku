import * as process from 'node:process'
import { createClient } from 'redis'
import { parsePositiveInt } from '~~/server/utils/parsers'

export const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379'

// `connect()` keeps retrying forever by default, so every caller awaiting it
// would hang for as long as Redis is down. Bound the attempt instead and let
// callers fall back to their in-memory path.
const REDIS_CONNECT_TIMEOUT_MS = parsePositiveInt(process.env.REDIS_CONNECT_TIMEOUT_MS, 3000)
const RETRY_COOLDOWN_MS = 30_000

export type RedisClient = ReturnType<typeof createClient>

let redisClientPromise: Promise<RedisClient | null> | null = null
let nextRetryAt = 0

async function createRedisConnection(): Promise<RedisClient | null> {
  const client = createClient({
    url: REDIS_URL,
    socket: {
      connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
      // Give up on the initial handshake instead of reconnecting in a loop;
      // `getRedisClient` schedules its own retry.
      reconnectStrategy: false,
    },
  })

  client.on('error', (error) => {
    console.error('Redis client error.', error)
  })

  try {
    await client.connect()
    return client
  }
  catch (error) {
    console.error('Failed to connect to Redis.', error)
    try {
      client.destroy()
    }
    catch {
      // `destroy()` throws ClientClosedError here: the socket already marked
      // itself closed after the failed handshake, so there is nothing left to
      // tear down.
    }
    return null
  }
}

export function getRedisClient(): Promise<RedisClient | null> {
  if (redisClientPromise) {
    return redisClientPromise
  }
  if (Date.now() < nextRetryAt) {
    return Promise.resolve(null)
  }

  redisClientPromise = createRedisConnection().then((client) => {
    if (client) {
      // A client that dies later must not be reused; the next call reconnects.
      client.on('end', () => {
        redisClientPromise = null
      })
      return client
    }
    redisClientPromise = null
    nextRetryAt = Date.now() + RETRY_COOLDOWN_MS
    return null
  })

  return redisClientPromise
}
