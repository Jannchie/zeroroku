import type { AnyPgTable } from 'drizzle-orm/pg-core'

import { sql } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { getQuery } from 'h3'
import { authorInfoMaster, authorLatestFans } from '~~/drizzle/schema'
import { db } from '~~/server/index'

interface FansTrendItem {
  mid: string
  name: string | null
  face: string | null
  fans: number
  delta: number
}

interface FansTrendResponse {
  items: FansTrendItem[]
}

interface FansTrendRow extends Record<string, unknown> {
  mid: string | number | null
  name: string | null
  face: string | null
  fans: string | number | null
  delta: string | number | null
}

type TrendDirection = 'up' | 'down'
type TrendPeriod = '1' | '7'

const CACHE_TTL_MS = 60_000
const RANKING_LIMIT = 50

const cachedResults = new Map<string, { data: FansTrendResponse, expiresAt: number }>()
const inFlight = new Map<string, Promise<FansTrendResponse>>()

function parseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

function toText(value: string | number | null): string {
  if (value === null) {
    return ''
  }
  return String(value)
}

function getTableIdentifier(table: AnyPgTable) {
  const config = getTableConfig(table)
  const schemaName = config.schema ?? 'public'
  return sql`${sql.identifier(schemaName)}.${sql.identifier(config.name)}`
}

function normalizeQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const [first] = value
    if (first === null || first === undefined) {
      return undefined
    }
    return typeof first === 'string' || typeof first === 'number' || typeof first === 'boolean'
      ? String(first)
      : undefined
  }
  if (value === null || value === undefined) {
    return undefined
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return undefined
}

function normalizePeriod(value: unknown): TrendPeriod {
  const normalized = normalizeQueryValue(value)
  if (normalized === '1' || normalized === '7') {
    return normalized
  }
  return '7'
}

function normalizeDirection(value: unknown): TrendDirection {
  const normalized = normalizeQueryValue(value)
  if (normalized === 'down') {
    return 'down'
  }
  return 'up'
}

function getCachedResult(key: string): FansTrendResponse | null {
  const cached = cachedResults.get(key)
  if (!cached) {
    return null
  }
  if (Date.now() >= cached.expiresAt) {
    cachedResults.delete(key)
    return null
  }
  return cached.data
}

async function loadTrend(period: TrendPeriod, direction: TrendDirection): Promise<FansTrendResponse> {
  const metricColumn = period === '7'
    ? sql`${sql.identifier('f')}.${sql.identifier('rate7')}`
    : sql`${sql.identifier('f')}.${sql.identifier('rate1')}`
  const orderClause = direction === 'down'
    ? sql`order by ${metricColumn} asc nulls last`
    : sql`order by ${metricColumn} desc nulls last`
  const signClause = direction === 'down'
    ? sql`${metricColumn} < 0`
    : sql`${metricColumn} > 0`
  const finalOrderClause = direction === 'down'
    ? sql`order by t.delta asc nulls last`
    : sql`order by t.delta desc nulls last`

  const fansTable = getTableIdentifier(authorLatestFans)
  const infoTable = getTableIdentifier(authorInfoMaster)

  const result = await db.execute<FansTrendRow>(sql`
    with top as (
      select
        f.mid,
        f.fans,
        ${metricColumn} as delta
      from ${fansTable} as f
      where ${metricColumn} is not null
        and f.fans is not null
        and ${signClause}
      ${orderClause}
      limit ${RANKING_LIMIT}
    )
    select
      t.mid::text as mid,
      t.fans::bigint as fans,
      t.delta::bigint as delta,
      i.name as name,
      i.face as face
    from top as t
    left join ${infoTable} as i on i.mid = t.mid
    ${finalOrderClause}
  `)

  const items = result.rows.map(row => ({
    mid: toText(row.mid),
    name: row.name,
    face: row.face,
    fans: parseNumber(row.fans),
    delta: parseNumber(row.delta),
  }))

  return { items }
}

export default defineEventHandler(async (event): Promise<FansTrendResponse> => {
  const query = getQuery(event)
  const period = normalizePeriod(query.period)
  const direction = normalizeDirection(query.direction)
  const cacheKey = `${period}-${direction}`

  const cached = getCachedResult(cacheKey)
  if (cached) {
    return cached
  }

  const existing = inFlight.get(cacheKey)
  if (existing) {
    return existing
  }

  const promise = loadTrend(period, direction)
  inFlight.set(cacheKey, promise)

  try {
    const result = await promise
    cachedResults.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })
    return result
  }
  finally {
    inFlight.delete(cacheKey)
  }
})
