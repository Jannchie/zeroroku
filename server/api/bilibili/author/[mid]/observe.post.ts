import type { AnyPgTable } from 'drizzle-orm/pg-core'

import { sql } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { createError, getRouterParam } from 'h3'
import { auth } from '~~/lib/auth'
import { creditRecords, user } from '~~/lib/database/auth-schema'
import { authorFansSchedules } from '~~/drizzle/schema'
import { db } from '~~/server/index'

interface ObserveResponse {
  ok: boolean
  cost: number
  credit: number
}

interface CreditRow extends Record<string, unknown> {
  credit: string | number | null
}

const OBSERVE_COST = 10
const MIN_MID = 0n
const MAX_MID = 9_223_372_036_854_775_807n

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

function getNamedTableIdentifier(tableName: string) {
  return sql`${sql.identifier('public')}.${sql.identifier(tableName)}`
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
  const videoScheduleTable = getNamedTableIdentifier('author_video_schedules')

  const result = await db.transaction(async (tx) => {
    const creditResult = await tx.execute<CreditRow>(sql`
      update ${user}
      set credit = ${user.credit} - ${OBSERVE_COST}
      where ${user.id} = ${userId}
        and ${user.credit} >= ${OBSERVE_COST}
      returning ${user.credit} as credit
    `)

    const creditValue = parseNumber(creditResult.rows[0]?.credit)
    if (creditValue === null) {
      throw createError({
        statusCode: 400,
        statusMessage: '积分不足。',
      })
    }

    await tx.insert(creditRecords).values({
      userId,
      credit: -OBSERVE_COST,
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

    return creditValue
  })

  return {
    ok: true,
    cost: OBSERVE_COST,
    credit: result,
  }
})
