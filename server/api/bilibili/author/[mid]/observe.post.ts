import type { AnyPgTable } from 'drizzle-orm/pg-core'

import { sql } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { createError, getRouterParam } from 'h3'
import { auth } from '~~/lib/auth'
import { authorFansSchedules, authorInfoSchedules, authorVideoSchedules } from '~~/drizzle/schema'
import { db } from '~~/server/index'
import { applyCreditChange } from '~~/server/utils/credit'

interface ObserveResponse {
  ok: boolean
  cost: number
  credit: number
}

const OBSERVE_COST = 10
const MIN_MID = BigInt('0')
const MAX_MID = BigInt('9223372036854775807')

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

function parseUserId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return value
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value)
    if (Number.isSafeInteger(parsed) && parsed > 0) {
      return parsed
    }
  }
  return null
}

function getTableIdentifier(table: AnyPgTable) {
  const config = getTableConfig(table)
  const schemaName = config.schema ?? 'public'
  return sql`${sql.identifier(schemaName)}.${sql.identifier(config.name)}`
}

export default defineEventHandler(async (event): Promise<ObserveResponse> => {
  const session = await auth.api.getSession({
    headers: event.headers,
  })
  const userId = parseUserId(session?.user?.id)
  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: '未登录。',
    })
  }

  const midParam = getRouterParam(event, 'mid')
  const numericMid = parseMid(midParam)
  if (numericMid === null) {
    throw createError({
      statusCode: 400,
      statusMessage: '无效的 MID。',
    })
  }

  const now = new Date()
  const priorityTime = new Date(0)
  const fansScheduleTable = getTableIdentifier(authorFansSchedules)
  const videoScheduleTable = getTableIdentifier(authorVideoSchedules)
  const infoScheduleTable = getTableIdentifier(authorInfoSchedules)

  const result = await db.transaction(async (tx) => {
    const creditResult = await applyCreditChange(tx, {
      userId,
      creditDelta: -OBSERVE_COST,
      text: '观测',
      createdAt: now,
      data: {
        type: 'observe',
        mid: numericMid.toString(),
      },
    })

    await tx.execute(sql`
      insert into ${fansScheduleTable} (mid, next, updated_at)
      values (${numericMid}, ${priorityTime}, ${now})
      on conflict (mid) do update
      set next = excluded.next, updated_at = excluded.updated_at
    `)

    await tx.execute(sql`
      insert into ${videoScheduleTable} (mid, next, updated_at)
      values (${numericMid}, ${priorityTime}, ${now})
      on conflict (mid) do update
      set next = excluded.next, updated_at = excluded.updated_at
    `)

    await tx.execute(sql`
      insert into ${infoScheduleTable} (mid, next, updated_at)
      values (${numericMid}, ${priorityTime}, ${now})
      on conflict (mid) do update
      set next = excluded.next, updated_at = excluded.updated_at
    `)

    return creditResult.credit
  })

  return {
    ok: true,
    cost: OBSERVE_COST,
    credit: result,
  }
})
