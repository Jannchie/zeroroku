import type { AnyPgTable } from 'drizzle-orm/pg-core'

import { sql } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { authorInfoMaster, authorLatestFans } from '~~/drizzle/schema'
import { db } from '~~/server/index'

interface FansRankingItem {
  mid: string
  name: string | null
  face: string | null
  fans: number
}

interface FansRankingResponse {
  items: FansRankingItem[]
}

interface FansRankingRow {
  mid: string | number | null
  name: string | null
  face: string | null
  fans: string | number | null
}

const CACHE_TTL_MS = 60_000
const RANKING_LIMIT = 50

let cachedRanking: FansRankingResponse | null = null
let cacheExpiresAt = 0
let inFlight: Promise<FansRankingResponse> | null = null

function getCachedRanking(): FansRankingResponse | null {
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

async function loadRanking(): Promise<FansRankingResponse> {
  const fansTable = getTableIdentifier(authorLatestFans)
  const infoTable = getTableIdentifier(authorInfoMaster)

  const result = await db.execute<FansRankingRow>(sql`
    with top as (
      select
        mid,
        fans
      from ${fansTable}
      where fans is not null
      order by fans desc nulls last
      limit ${RANKING_LIMIT}
    )
    select
      t.mid::text as mid,
      t.fans::bigint as fans,
      i.name as name,
      i.face as face
    from top as t
    left join ${infoTable} as i on i.mid = t.mid
    order by t.fans desc nulls last
  `)

  const items = result.rows.map(row => ({
    mid: toText(row.mid),
    name: row.name,
    face: row.face,
    fans: parseNumber(row.fans),
  }))

  return { items }
}

export default defineEventHandler(async (): Promise<FansRankingResponse> => {
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
