import type { AnyPgTable } from 'drizzle-orm/pg-core'

import { sql } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { authorInfoMaster, videoInfoMaster } from '~~/drizzle/schema'
import { db } from '~~/server/index'

interface BilibiliStatsResponse {
  videoCount: number
  userCount: number
}

interface TableRef {
  schema: string
  name: string
}

const CACHE_TTL_MS = 60_000
let cachedStats: BilibiliStatsResponse | null = null
let cacheExpiresAt = 0
let inFlight: Promise<BilibiliStatsResponse> | null = null

function parseCount(value: string | undefined): number {
  if (!value) {
    return 0
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

function getCachedStats(): BilibiliStatsResponse | null {
  if (!cachedStats) {
    return null
  }
  if (Date.now() >= cacheExpiresAt) {
    return null
  }
  return cachedStats
}

function getTableRef(table: AnyPgTable): TableRef {
  const config = getTableConfig(table)
  return {
    schema: 'public',
    name: config.name,
  }
}

async function countTableRows(table: AnyPgTable): Promise<number> {
  const ref = getTableRef(table)
  const tableIdent = sql`${sql.identifier(ref.schema)}.${sql.identifier(ref.name)}`
  const result = await db.execute<{ count: string }>(
    sql`select count(*)::bigint as count from ${tableIdent}`,
  )
  return parseCount(result.rows[0]?.count)
}

async function loadStats(): Promise<BilibiliStatsResponse> {
  const [videoCount, userCount] = await Promise.all([
    countTableRows(videoInfoMaster),
    countTableRows(authorInfoMaster),
  ])
  return {
    videoCount,
    userCount,
  }
}

export default defineEventHandler(async (): Promise<BilibiliStatsResponse> => {
  const cached = getCachedStats()
  if (cached) {
    return cached
  }

  if (!inFlight) {
    inFlight = loadStats()
  }

  try {
    const stats = await inFlight
    cachedStats = stats
    cacheExpiresAt = Date.now() + CACHE_TTL_MS
    return stats
  }
  finally {
    inFlight = null
  }
})
