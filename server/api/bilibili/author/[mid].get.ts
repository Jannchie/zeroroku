import type { H3Event } from 'h3'

import { sql } from 'drizzle-orm'
import { getRequestIP, getRouterParam } from 'h3'
import { authorInfoMaster, authorLatestFans, authorVisitRecords, livers } from '~~/drizzle/schema'
import { auth } from '~~/lib/auth'
import { db } from '~~/server/index'
import { parseNumberOrNull, parseUnsignedBigInt, toText } from '~~/server/utils/parsers'
import { getTableIdentifier } from '~~/server/utils/table'

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
  liveStatus: number | null
  liveRoomId: string | null
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
  live_status: string | number | null
  room_id: string | number | null
}

function normalizeRoomId(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null
  }
  const text = String(value).trim()
  if (!text || text === '0') {
    return null
  }
  if (!/^\d+$/.test(text)) {
    return null
  }
  return text
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
  const numericMid = parseUnsignedBigInt(midParam)
  if (numericMid === null) {
    return { item: null }
  }

  const infoTable = getTableIdentifier(authorInfoMaster)
  const fansTable = getTableIdentifier(authorLatestFans)
  const liversTable = getTableIdentifier(livers)
  const detailResult = await db.execute<AuthorDetailRow>(sql`
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
      f.rate1::bigint as rate1,
      l.live_status::bigint as live_status,
      l.room_id::text as room_id
    from ${infoTable} as i
    left join ${fansTable} as f on f.mid = i.mid
    left join ${liversTable} as l on l.mid = i.mid
    where i.mid = ${numericMid}
    limit 1
  `)

  const row = detailResult.rows[0]
  if (!row) {
    return { item: null }
  }

  const fansValue = parseNumberOrNull(row.fans)
  const rate7Value = parseNumberOrNull(row.rate7)
  const rate1Value = parseNumberOrNull(row.rate1)
  const liveStatusValue = parseNumberOrNull(row.live_status)
  const liveRoomIdValue = normalizeRoomId(row.room_id)

  await recordVisit(event, numericMid)

  return {
    item: {
      mid: toText(row.mid),
      name: row.name,
      face: row.face,
      sign: row.sign,
      sex: row.sex,
      level: parseNumberOrNull(row.level),
      topPhoto: row.top_photo,
      fans: fansValue,
      rate7: rate7Value,
      rate1: rate1Value,
      liveStatus: liveStatusValue,
      liveRoomId: liveRoomIdValue,
    },
  }
})
