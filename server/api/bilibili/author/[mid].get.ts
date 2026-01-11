import type { AnyPgTable } from 'drizzle-orm/pg-core'
import type { H3Event } from 'h3'

import { sql } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { getRequestIP, getRouterParam } from 'h3'
import { auth } from '~~/lib/auth'
import { authorInfoMaster, authorLatestFans, authorVisitRecords } from '~~/drizzle/schema'
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
}

const MIN_MID = BigInt(0)
const MAX_MID = BigInt('9223372036854775807')

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
  const result = await db.execute<AuthorDetailRow>(sql`
    select
      i.mid::text as mid,
      i.name as name,
      i.face as face,
      i.sign as sign,
      i.sex as sex,
      i.level::bigint as level,
      i.top_photo as top_photo,
      f.fans::bigint as fans
    from ${infoTable} as i
    left join ${fansTable} as f on f.mid = i.mid
    where i.mid = ${numericMid}
    limit 1
  `)

  const row = result.rows[0]
  if (!row) {
    return { item: null }
  }

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
      fans: parseNumber(row.fans),
    },
  }
})
