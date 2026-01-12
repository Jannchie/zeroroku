import { sql } from 'drizzle-orm'
import { createError } from 'h3'
import { auth } from '~~/lib/auth'
import { checkIns } from '~~/lib/database/auth-schema'
import { db } from '~~/server/index'
import { applyCreditChange } from '~~/server/utils/credit'

interface DailyLoginResponse {
  awarded: boolean
  credit: number
  dayKey: string
  exp: number
}

const DAILY_REWARD = 10
const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_RESET_MS = 12 * 60 * 60 * 1000

function getChinaNoonDayKey(date: Date): string {
  const shifted = new Date(date.getTime() + CHINA_OFFSET_MS - DAY_RESET_MS)
  const year = shifted.getUTCFullYear()
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const day = String(shifted.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getChinaNoonDayStart(date: Date): Date {
  const dayKey = getChinaNoonDayKey(date)
  const [
    year,
    month,
    day,
  ] = dayKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 4, 0, 0))
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

export default defineEventHandler(async (event): Promise<DailyLoginResponse> => {
  const session = await auth.api.getSession({
    headers: event.headers,
  })
  const userId = parseUserId(session?.user?.id)

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized.',
    })
  }

  const now = new Date()
  const dayKey = getChinaNoonDayKey(now)
  const dayStart = getChinaNoonDayStart(now)

  const result = await db.transaction(async (tx) => {
    const checkInResult = await tx.execute(sql`
      insert into ${checkIns} (id, updated_at)
      values (${userId}, ${now})
      on conflict (id) do update
      set updated_at = excluded.updated_at
      where ${checkIns}.updated_at is null or ${checkIns}.updated_at < ${dayStart}
      returning id
    `)

    if (checkInResult.rows.length === 0) {
      return { awarded: false }
    }

    await applyCreditChange(tx, {
      userId,
      creditDelta: DAILY_REWARD,
      expDelta: DAILY_REWARD,
      text: '登录',
      createdAt: now,
      data: {
        type: 'login',
      },
    })

    return { awarded: true }
  })

  return {
    awarded: result.awarded,
    credit: result.awarded ? DAILY_REWARD : 0,
    dayKey,
    exp: result.awarded ? DAILY_REWARD : 0,
  }
})
