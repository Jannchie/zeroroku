import type { AnyPgTable } from 'drizzle-orm/pg-core'

import { sql } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { user } from '~~/lib/database/auth-schema'
import { db } from '~~/server/index'

interface UserExpRankItem {
  id: string
  name: string | null
  exp: number
}

interface UserExpRankResponse {
  items: UserExpRankItem[]
}

interface UserExpRankRow extends Record<string, unknown> {
  id: string | number | null
  name: string | null
  exp: string | number | null
}

const CACHE_TTL_MS = 60_000
const RANKING_LIMIT = 100

let cachedRanking: UserExpRankResponse | null = null
let cacheExpiresAt = 0
let inFlight: Promise<UserExpRankResponse> | null = null

function getCachedRanking(): UserExpRankResponse | null {
  if (!cachedRanking) {
    return null
  }
  if (Date.now() >= cacheExpiresAt) {
    return null
  }
  return cachedRanking
}

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

async function loadRanking(): Promise<UserExpRankResponse> {
  const userTable = getTableIdentifier(user)
  const result = await db.execute<UserExpRankRow>(sql`
    select
      id,
      name,
      exp
    from ${userTable}
    order by exp desc nulls last, updated_at desc nulls last
    limit ${RANKING_LIMIT}
  `)

  const items = result.rows.map(row => ({
    id: toText(row.id),
    name: row.name,
    exp: parseNumber(row.exp),
  }))

  return { items }
}

export default defineEventHandler(async (): Promise<UserExpRankResponse> => {
  const cached = getCachedRanking()
  if (cached) {
    return cached
  }

  if (!inFlight) {
    inFlight = loadRanking()
  }

  try {
    const ranking = await inFlight
    cachedRanking = ranking
    cacheExpiresAt = Date.now() + CACHE_TTL_MS
    return ranking
  }
  finally {
    inFlight = null
  }
})
