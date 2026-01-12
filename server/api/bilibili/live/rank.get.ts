import type { AnyPgTable } from 'drizzle-orm/pg-core'

import { sql } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { getQuery } from 'h3'
import { liveRoomGiftAggregations, livers } from '~~/drizzle/schema'
import { db } from '~~/server/index'

interface LiveRankItem {
  roomId: string
  mid: string | null
  name: string | null
  face: string | null
  amount: number
  gifts: number
}

interface LiveRankResponse {
  windowMinutes: number
  items: LiveRankItem[]
}

interface LiveRankRow extends Record<string, unknown> {
  room_id: string | number | null
  mid: string | number | null
  name: string | null
  face: string | null
  amount: string | number | null
  gifts: string | number | null
}

type QueryValue = string | number | boolean | null | undefined

const DEFAULT_WINDOW_MINUTES = 60
const MIN_WINDOW_MINUTES = 10
const MAX_WINDOW_MINUTES = 7 * 24 * 60
const RANK_LIMIT = 50
const CACHE_TTL_MS = 60_000

const cachedResults = new Map<number, { data: LiveRankResponse, expiresAt: number }>()
const inFlight = new Map<number, Promise<LiveRankResponse>>()

function parseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  const parsed = Number.parseFloat(value)
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

function normalizeQueryValue(value: unknown): QueryValue {
  if (Array.isArray(value)) {
    const [first] = value
    if (first === null || first === undefined) {
      return null
    }
    return typeof first === 'string' || typeof first === 'number' || typeof first === 'boolean'
      ? first
      : null
  }
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  return null
}

function normalizeMinutes(value: unknown): number {
  const normalized = normalizeQueryValue(value)
  if (normalized === null) {
    return DEFAULT_WINDOW_MINUTES
  }
  const parsed = typeof normalized === 'number'
    ? normalized
    : Number.parseInt(String(normalized), 10)
  if (!Number.isFinite(parsed)) {
    return DEFAULT_WINDOW_MINUTES
  }
  const clamped = Math.max(MIN_WINDOW_MINUTES, Math.min(MAX_WINDOW_MINUTES, Math.floor(parsed)))
  return clamped
}

function getCachedResult(minutes: number): LiveRankResponse | null {
  const cached = cachedResults.get(minutes)
  if (!cached) {
    return null
  }
  if (Date.now() >= cached.expiresAt) {
    cachedResults.delete(minutes)
    return null
  }
  return cached.data
}

async function loadRanking(windowMinutes: number): Promise<LiveRankResponse> {
  const aggregationTable = getTableIdentifier(liveRoomGiftAggregations)
  const liversTable = getTableIdentifier(livers)

  const result = await db.execute<LiveRankRow>(sql`
    with latest as (
      select max("timestamp") as max_ts
      from ${aggregationTable}
    ),
    ranked as (
      select
        a.room_id,
        sum((a.price::numeric) * (a.count::numeric)) as amount,
        sum(a.count)::bigint as gifts
      from ${aggregationTable} as a
      where a.room_id is not null
        and a."timestamp" is not null
        and a."timestamp" >= (select max_ts from latest) - (${windowMinutes}::int || ' minutes')::interval
      group by a.room_id
      order by amount desc nulls last
      limit ${RANK_LIMIT}
    )
    select
      r.room_id::text as room_id,
      r.amount::numeric as amount,
      r.gifts::bigint as gifts,
      l.mid::text as mid,
      l.name as name,
      l.face as face
    from ranked as r
    left join ${liversTable} as l on l.room_id = r.room_id
    order by r.amount desc nulls last
  `)

  const items = result.rows.map(row => ({
    roomId: toText(row.room_id),
    mid: row.mid === null ? null : toText(row.mid),
    name: row.name,
    face: row.face,
    amount: parseNumber(row.amount),
    gifts: parseNumber(row.gifts),
  }))

  return {
    windowMinutes,
    items,
  }
}

export default defineEventHandler(async (event): Promise<LiveRankResponse> => {
  const query = getQuery(event)
  const minutes = normalizeMinutes(query.minutes)

  const cached = getCachedResult(minutes)
  if (cached) {
    return cached
  }

  const existing = inFlight.get(minutes)
  if (existing) {
    return existing
  }

  const promise = loadRanking(minutes)
  inFlight.set(minutes, promise)

  try {
    const result = await promise
    cachedResults.set(minutes, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })
    return result
  }
  finally {
    inFlight.delete(minutes)
  }
})
