import type { AnyPgTable } from 'drizzle-orm/pg-core'

import { sql } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { getQuery } from 'h3'
import { authorInfoMaster, authorLatestFans } from '~~/drizzle/schema'
import { db } from '~~/server/index'

interface AuthorShieldRow extends Record<string, unknown> {
  name: string | null
  fans: string | number | null
}

interface ShieldResponse {
  schemaVersion: number
  label: string
  message: string
  namedLogo?: string
  isError?: boolean
}

interface CacheEntry {
  value: ShieldResponse
  expiresAt: number
}

const MIN_MID = 0n
const MAX_MID = 9_223_372_036_854_775_807n
const DEFAULT_LABEL = '哔哩哔哩'
const DEFAULT_MESSAGE = '无数据'
const NAMED_LOGO = 'bilibili'
const CACHE_TTL_MS = 60_000
const cache = new Map<string, CacheEntry>()

const COMPACT_UNITS = [
  { value: 1e12, suffix: 'T' },
  { value: 1e9, suffix: 'B' },
  { value: 1e6, suffix: 'M' },
  { value: 1e3, suffix: 'K' },
]

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

function parseMid(value: string | null | undefined): bigint | null {
  if (!value) {
    return null
  }
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) {
    return null
  }
  let numeric: bigint
  try {
    numeric = BigInt(trimmed)
  }
  catch {
    return null
  }
  if (numeric < MIN_MID || numeric > MAX_MID) {
    return null
  }
  return numeric
}

function parseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function trimTrailingZero(value: string): string {
  return value.replace(/\.0$/, '')
}

function formatCompactCount(value: number): string {
  if (!Number.isFinite(value)) {
    return '0'
  }
  const abs = Math.abs(value)
  for (let index = 0; index < COMPACT_UNITS.length; index += 1) {
    const unit = COMPACT_UNITS[index]
    if (abs >= unit.value) {
      const scaled = value / unit.value
      const rounded = Number(scaled.toFixed(1))
      if (rounded >= 1000 && index > 0) {
        const nextUnit = COMPACT_UNITS[index - 1]
        const nextScaled = value / nextUnit.value
        return `${trimTrailingZero(nextScaled.toFixed(1))}${nextUnit.suffix}`
      }
      return `${trimTrailingZero(scaled.toFixed(1))}${unit.suffix}`
    }
  }
  return Math.round(value).toString()
}

function getTableIdentifier(table: AnyPgTable) {
  const config = getTableConfig(table)
  const schemaName = config.schema ?? 'public'
  return sql`${sql.identifier(schemaName)}.${sql.identifier(config.name)}`
}

function getCached(mid: string): ShieldResponse | null {
  const cached = cache.get(mid)
  if (!cached) {
    return null
  }
  if (Date.now() >= cached.expiresAt) {
    cache.delete(mid)
    return null
  }
  return cached.value
}

function setCached(mid: string, value: ShieldResponse): void {
  cache.set(mid, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

function buildResponse(label: string, message: string, isError = false): ShieldResponse {
  return {
    schemaVersion: 1,
    label,
    message,
    namedLogo: NAMED_LOGO,
    ...(isError ? { isError: true } : {}),
  }
}

export default defineEventHandler(async (event): Promise<ShieldResponse> => {
  const query = getQuery(event)
  const midParam = normalizeQueryValue(query.mid)
  const numericMid = parseMid(midParam)
  if (numericMid === null) {
    return buildResponse(DEFAULT_LABEL, DEFAULT_MESSAGE, true)
  }

  const midKey = numericMid.toString()
  const cached = getCached(midKey)
  if (cached) {
    return cached
  }

  const infoTable = getTableIdentifier(authorInfoMaster)
  const fansTable = getTableIdentifier(authorLatestFans)
  const result = await db.execute<AuthorShieldRow>(sql`
    select
      i.name as name,
      f.fans::bigint as fans
    from ${infoTable} as i
    left join ${fansTable} as f on f.mid = i.mid
    where i.mid = ${numericMid}
    limit 1
  `)

  const row = result.rows[0]
  if (!row) {
    const response = buildResponse(DEFAULT_LABEL, DEFAULT_MESSAGE, true)
    setCached(midKey, response)
    return response
  }

  const label = row.name?.trim() || DEFAULT_LABEL
  const fansValue = parseNumber(row.fans)
  if (fansValue === null) {
    const response = buildResponse(label, DEFAULT_MESSAGE, true)
    setCached(midKey, response)
    return response
  }

  const response = buildResponse(label, formatCompactCount(fansValue))
  setCached(midKey, response)
  return response
})
