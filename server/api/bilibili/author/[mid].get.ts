import type { AnyPgTable } from 'drizzle-orm/pg-core'
import type { H3Event } from 'h3'

import { sql } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { getRequestIP, getRouterParam } from 'h3'
import { authorInfoMaster, authorLatestFans, authorVisitRecords } from '~~/drizzle/schema'
import { auth } from '~~/lib/auth'
import { db } from '~~/server/index'

interface AuthorDetailItem {
  mid: string
  name: string | null
  face: string | null
  sign: string | null
  sex: string | null
  level: number | null
  topPhoto: string | null
  fans: number | null
  rate7: number | null
  rate1: number | null
  fansRank: number | null
  fansTotal: number | null
  rate7Rank: number | null
  rate7Total: number | null
  rate1Rank: number | null
  rate1Total: number | null
}

interface AuthorDetailResponse {
  item: AuthorDetailItem | null
}

interface AuthorDetailRow extends Record<string, unknown> {
  mid: string | number | null
  name: string | null
  face: string | null
  sign: string | null
  sex: string | null
  level: string | number | null
  top_photo: string | null
  fans: string | number | null
  rate7: string | number | null
  rate1: string | number | null
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

function toText(value: string | number | null): string {
  if (value === null) {
    return ''
  }
  return String(value)
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

function parseUid(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) {
      return null
    }
    return value
  }
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) {
    return null
  }
  const parsed = Number(trimmed)
  if (!Number.isSafeInteger(parsed)) {
    return null
  }
  return parsed
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

async function recordVisit(event: H3Event, mid: bigint): Promise<void> {
  const session = await auth.api.getSession({
    headers: event.headers,
  })
  const uid = parseUid(session?.user?.id)
  const ip = getRequestIP(event) ?? null
  const visitTable = getTableIdentifier(authorVisitRecords)

  await db.execute(sql`
    insert into ${visitTable} (mid, uid, ip, created_at)
    values (${mid}, ${uid}, ${ip}, now())
  `)
}

export default defineEventHandler(async (event): Promise<AuthorDetailResponse> => {
  const midParam = getRouterParam(event, 'mid')
  const numericMid = parseMid(midParam)
  if (numericMid === null) {
    return { item: null }
  }

  const infoTable = getTableIdentifier(authorInfoMaster)
  const fansTable = getTableIdentifier(authorLatestFans)
  const detailPromise = db.execute<AuthorDetailRow>(sql`
    select
      i.mid::text as mid,
      i.name as name,
      i.face as face,
      i.sign as sign,
      i.sex as sex,
      i.level::bigint as level,
      i.top_photo as top_photo,
      f.fans::bigint as fans,
      f.rate7::bigint as rate7,
      f.rate1::bigint as rate1
    from ${infoTable} as i
    left join ${fansTable} as f on f.mid = i.mid
    where i.mid = ${numericMid}
    limit 1
  `)

  const [detailResult, totals, ranking] = await Promise.all([
    detailPromise,
    getRankingTotals(),
    loadRankingPositions(numericMid),
  ])

  const row = detailResult.rows[0]
  if (!row) {
    return { item: null }
  }

  const fansValue = parseNumber(row.fans)
  const rate7Value = parseNumber(row.rate7)
  const rate1Value = parseNumber(row.rate1)

  await recordVisit(event, numericMid)

  return {
    item: {
      mid: toText(row.mid),
      name: row.name,
      face: row.face,
      sign: row.sign,
      sex: row.sex,
      level: parseNumber(row.level),
      topPhoto: row.top_photo,
      fans: fansValue,
      rate7: rate7Value,
      rate1: rate1Value,
      fansRank: ranking.fansRank,
      fansTotal: totals.fansTotal,
      rate7Rank: ranking.rate7Rank,
      rate7Total: totals.rate7Total,
      rate1Rank: ranking.rate1Rank,
      rate1Total: totals.rate1Total,
    },
  }
})
