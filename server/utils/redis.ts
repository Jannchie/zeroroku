import * as process from 'node:process'
import { createClient } from 'redis'

const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379'

export type RedisClient = ReturnType<typeof createClient>

let redisClientPromise: Promise<RedisClient | null> | null = null

async function createRedisConnection(): Promise<RedisClient | null> {
  const client = createClient({ url: REDIS_URL })

  client.on('error', (error) => {
    console.error('Redis client error.', error)
  })

  try {
    await client.connect()
    return client
  }
  catch (error) {
    console.error('Failed to connect to Redis.', error)
    return null
  }
}

export function getRedisClient(): Promise<RedisClient | null> {
  redisClientPromise ??= createRedisConnection()
  return redisClientPromise
}
