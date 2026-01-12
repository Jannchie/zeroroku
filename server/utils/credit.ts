import { sql } from 'drizzle-orm'
import { createError } from 'h3'
import { creditRecords, user } from '~~/lib/database/auth-schema'

export interface CreditChangeInput {
  userId: number
  creditDelta: number
  expDelta?: number
  text: string
  data?: Record<string, unknown> | null
  createdAt?: Date
  requireCredit?: boolean
}

export interface CreditChangeResult {
  credit: number
  exp: number
}

interface CreditRow extends Record<string, unknown> {
  credit: string | number | null
  exp: string | number | null
}

type CreditClient = Pick<typeof import('~~/server/index').db, 'execute' | 'insert'>

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

export async function applyCreditChange(
  tx: CreditClient,
  input: CreditChangeInput,
): Promise<CreditChangeResult> {
  const creditDelta = input.creditDelta
  const expDelta = input.expDelta ?? 0
  const requireCredit = input.requireCredit ?? creditDelta < 0
  const createdAt = input.createdAt ?? new Date()

  const creditGuard = requireCredit && creditDelta < 0
    ? sql`and ${user.credit} >= ${Math.abs(creditDelta)}`
    : sql``

  const result = await tx.execute<CreditRow>(sql`
    update ${user}
    set credit = ${user.credit} + ${creditDelta},
      exp = ${user.exp} + ${expDelta}
    where ${user.id} = ${input.userId}
    ${creditGuard}
    returning ${user.credit} as credit, ${user.exp} as exp
  `)

  const creditValue = parseNumber(result.rows[0]?.credit)
  const expValue = parseNumber(result.rows[0]?.exp)

  if (creditValue === null || expValue === null) {
    if (requireCredit && creditDelta < 0) {
      throw createError({
        statusCode: 400,
        statusMessage: '积分不足。',
      })
    }
    throw createError({
      statusCode: 400,
      statusMessage: '用户不存在。',
    })
  }

  await tx.insert(creditRecords).values({
    userId: input.userId,
    credit: creditDelta,
    text: input.text,
    createdAt,
    data: input.data ?? null,
  })

  return { credit: creditValue, exp: expValue }
}
