import type { RedisClientType } from 'redis'
import { randomUUID } from 'node:crypto'
import * as process from 'node:process'
import { createClient } from 'redis'

interface OnlineUpdatePayload {
  instanceId: string
  count: number
}

type OnlineListener = (count: number) => void

const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379'
const CONNECTIONS_KEY = 'online:connections'
const UPDATES_CHANNEL = 'online:updates'
const STALE_MS = 45_000
const CLEANUP_INTERVAL_MS = 15_000
const INSTANCE_ID = process.env.pm_id ? `pm2-${process.env.pm_id}` : randomUUID()

class OnlineCounter {
  private client: RedisClientType
  private subscriber: RedisClientType
  private listeners = new Set<OnlineListener>()
  private ready: Promise<void>
  private lastPublishedCount = 0

  constructor() {
    this.client = createClient({ url: REDIS_URL })
    this.subscriber = this.client.duplicate()
    this.ready = this.initialize().catch((error) => {
      console.error('Failed to initialize online counter.', error)
      throw error
    })
  }

  private async initialize(): Promise<void> {
    this.client.on('error', (error) => {
      console.error('Redis client error.', error)
    })
    this.subscriber.on('error', (error) => {
      console.error('Redis subscriber error.', error)
    })

    await this.client.connect()
    await this.subscriber.connect()
    await this.subscriber.subscribe(UPDATES_CHANNEL, (message) => {
      this.handleMessage(message)
    })

    const cleanupTimer = setInterval(() => {
      void this.cleanupAndPublish()
    }, CLEANUP_INTERVAL_MS)
    cleanupTimer.unref?.()
  }

  private handleMessage(message: string): void {
    const payload = this.parseUpdateMessage(message)
    if (!payload || payload.instanceId === INSTANCE_ID) {
      return
    }
    if (payload.count === this.lastPublishedCount) {
      return
    }
    this.lastPublishedCount = payload.count
    this.notify(payload.count)
  }

  private parseUpdateMessage(message: string): OnlineUpdatePayload | null {
    try {
      const parsed = JSON.parse(message) as Partial<OnlineUpdatePayload>
      if (typeof parsed.instanceId !== 'string' || typeof parsed.count !== 'number') {
        return null
      }
      return { instanceId: parsed.instanceId, count: parsed.count }
    }
    catch {
      return null
    }
  }

  private notify(count: number): void {
    for (const listener of this.listeners) {
      try {
        listener(count)
      }
      catch (error) {
        console.error('Failed to notify online count listener.', error)
      }
    }
  }

  private async ensureReady(): Promise<void> {
    await this.ready
  }

  private async countActive(now = Date.now()): Promise<number> {
    const minScore = now - STALE_MS
    const count = await this.client.zCount(CONNECTIONS_KEY, minScore, '+inf')
    return Number(count)
  }

  private async publishCount(count: number): Promise<void> {
    if (count === this.lastPublishedCount) {
      return
    }
    this.lastPublishedCount = count
    this.notify(count)
    const payload: OnlineUpdatePayload = { instanceId: INSTANCE_ID, count }
    await this.client.publish(UPDATES_CHANNEL, JSON.stringify(payload))
  }

  private async cleanupAndPublish(): Promise<void> {
    await this.ensureReady()
    const now = Date.now()
    const staleBefore = now - STALE_MS
    await this.client.zRemRangeByScore(CONNECTIONS_KEY, 0, staleBefore)
    const count = await this.countActive(now)
    await this.publishCount(count)
  }

  subscribe(listener: OnlineListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async openSession(): Promise<{ id: string, count: number }> {
    await this.ensureReady()
    const id = randomUUID()
    const now = Date.now()
    await this.client.zAdd(CONNECTIONS_KEY, { score: now, value: id })
    const count = await this.countActive(now)
    await this.publishCount(count)
    return { id, count }
  }

  async touch(id: string): Promise<void> {
    await this.ensureReady()
    await this.client.zAdd(CONNECTIONS_KEY, { score: Date.now(), value: id })
  }

  async closeSession(id: string): Promise<void> {
    await this.ensureReady()
    await this.client.zRem(CONNECTIONS_KEY, id)
    const count = await this.countActive()
    await this.publishCount(count)
  }
}

export const onlineCounter = new OnlineCounter()
