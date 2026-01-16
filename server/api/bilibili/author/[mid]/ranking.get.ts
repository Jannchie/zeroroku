import type { AnyPgTable } from 'drizzle-orm/pg-core'

import { sql } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { getRouterParam } from 'h3'
import { authorLatestFans } from '~~/drizzle/schema'
import { db } from '~~/server/index'

interface AuthorRankingItem {
  fansRank: number | null
  fansTotal: number | null
  rate7Rank: number | null
  rate7Total: number | null
  rate1Rank: number | null
  rate1Total: number | null
}

interface AuthorRankingResponse {
  item: AuthorRankingItem | null
}

interface RankingTotalsRow extends Record<string, unknown> {
  fans_total: string | number | null
  rate7_total: string | number | null
  rate1_total: string | number | null
}

interface RankingTotals {
  fansTotal: number
  rate7Total: number
  rate1Total: number
}

interface RankingRow extends Record<string, unknown> {
  fans_rank: string | number | null
  rate7_rank: string | number | null
  rate1_rank: string | number | null
}

interface RankingPositions {
  fansRank: number | null
  rate7Rank: number | null
  rate1Rank: number | null
}

const MIN_MID = 0n
const MAX_MID = 9_223_372_036_854_775_807n
const RANKING_CACHE_TTL_MS = 60_000

let cachedRankingTotals: RankingTotals | null = null
let rankingTotalsExpiresAt = 0
let rankingTotalsInFlight: Promise<RankingTotals> | null = null

function parseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? null : parsed
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

function getTableIdentifier(table: AnyPgTable) {
  const config = getTableConfig(table)
  const schemaName = config.schema ?? 'public'
  return sql`${sql.identifier(schemaName)}.${sql.identifier(config.name)}`
}

function getCachedRankingTotals(): RankingTotals | null {
  if (!cachedRankingTotals) {
    return null
  }
  if (Date.now() >= rankingTotalsExpiresAt) {
    return null
  }
  return cachedRankingTotals
}

async function loadRankingTotals(): Promise<RankingTotals> {
  const fansTable = getTableIdentifier(authorLatestFans)
  const result = await db.execute<RankingTotalsRow>(sql`
    select
      count(fans)::bigint as fans_total,
      count(rate7)::bigint as rate7_total,
      count(rate1)::bigint as rate1_total
    from ${fansTable}
  `)
  const row = result.rows[0]
  return {
    fansTotal: parseNumber(row?.fans_total) ?? 0,
    rate7Total: parseNumber(row?.rate7_total) ?? 0,
    rate1Total: parseNumber(row?.rate1_total) ?? 0,
  }
}

async function getRankingTotals(): Promise<RankingTotals> {
  const cached = getCachedRankingTotals()
  if (cached) {
    return cached
  }
  if (!rankingTotalsInFlight) {
    rankingTotalsInFlight = loadRankingTotals()
  }
  try {
    const totals = await rankingTotalsInFlight
    cachedRankingTotals = totals
    rankingTotalsExpiresAt = Date.now() + RANKING_CACHE_TTL_MS
    return totals
  }
  finally {
    rankingTotalsInFlight = null
  }
}

async function loadRankingPositions(mid: bigint): Promise<RankingPositions> {
  const fansTable = getTableIdentifier(authorLatestFans)
  const result = await db.execute<RankingRow>(sql`
    with target as (
      select
        mid,
        fans,
        rate7,
        rate1
      from ${fansTable}
      where mid = ${mid}
    )
    select
      case when t.fans is null then null else (
        select count(*)::bigint + 1
        from ${fansTable}
        where fans is not null
          and (fans > t.fans or (fans = t.fans and mid < t.mid))
      ) end as fans_rank,
      case when t.rate7 is null then null else (
        select count(*)::bigint + 1
        from ${fansTable}
        where rate7 is not null
          and (rate7 > t.rate7 or (rate7 = t.rate7 and mid < t.mid))
      ) end as rate7_rank,
      case when t.rate1 is null then null else (
        select count(*)::bigint + 1
        from ${fansTable}
        where rate1 is not null
          and (rate1 > t.rate1 or (rate1 = t.rate1 and mid < t.mid))
      ) end as rate1_rank
    from (select 1) as base
    left join target as t on true
  `)
  const row = result.rows[0]
  return {
    fansRank: parseNumber(row?.fans_rank),
    rate7Rank: parseNumber(row?.rate7_rank),
    rate1Rank: parseNumber(row?.rate1_rank),
  }
}

export default defineEventHandler(async (event): Promise<AuthorRankingResponse> => {
  const midParam = getRouterParam(event, 'mid')
  const numericMid = parseMid(midParam)
  if (numericMid === null) {
    return { item: null }
  }

  const [totals, ranking] = await Promise.all([
    getRankingTotals(),
    loadRankingPositions(numericMid),
  ])

  return {
    item: {
      fansRank: ranking.fansRank,
      fansTotal: totals.fansTotal,
      rate7Rank: ranking.rate7Rank,
      rate7Total: totals.rate7Total,
      rate1Rank: ranking.rate1Rank,
      rate1Total: totals.rate1Total,
    },
  }
})
