import { sql } from 'drizzle-orm'
import { getRouterParam } from 'h3'
import { authorFansStatMaster } from '~~/drizzle/schema'
import { db } from '~~/server/index'
import { parseNumberOrNull, parseUnsignedBigInt, toText } from '~~/server/utils/parsers'
import { getTableIdentifier } from '~~/server/utils/table'

interface AuthorFansHistoryItem {
  id: string
  mid: string
  fans: number | null
  createdAt: string | null
  rate1: number | null
  rate7: number | null
}

interface AuthorFansHistoryResponse {
  items: AuthorFansHistoryItem[]
}

interface AuthorFansHistoryRow extends Record<string, unknown> {
  id: string | number | null
  mid: string | number | null
  fans: string | number | null
  created_at: string | Date | null
  rate1: string | number | null
  rate7: string | number | null
}

const AGGREGATION_TIMEZONE = 'Asia/Shanghai'

function toTimestamp(value: string | Date | null): string | null {
  if (value === null) {
    return null
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export default defineEventHandler(async (event): Promise<AuthorFansHistoryResponse> => {
  const midParam = getRouterParam(event, 'mid')
  const numericMid = parseUnsignedBigInt(midParam)
  if (numericMid === null) {
    return { items: [] }
  }

  const historyTable = getTableIdentifier(authorFansStatMaster)
  const timezoneLiteral = sql.raw(`'${AGGREGATION_TIMEZONE}'`)
  const timeExpression = sql`(created_at AT TIME ZONE ${timezoneLiteral})`
  const dayExpression = sql`date_trunc('day', ${timeExpression})`
  const result = await db.execute<AuthorFansHistoryRow>(sql`
    select
      distinct on (${dayExpression})
      id::text as id,
      mid::text as mid,
      fans::bigint as fans,
      created_at as created_at,
      rate1::bigint as rate1,
      rate7::bigint as rate7
    from ${historyTable}
    where mid = ${numericMid}
      and created_at is not null
    order by ${dayExpression} desc, created_at desc, id desc
  `)

  const items = result.rows.map(row => ({
    id: toText(row.id),
    mid: toText(row.mid),
    fans: parseNumberOrNull(row.fans),
    createdAt: toTimestamp(row.created_at),
    rate1: parseNumberOrNull(row.rate1),
    rate7: parseNumberOrNull(row.rate7),
  }))

  return { items }
})
