import type { AnyPgTable } from 'drizzle-orm/pg-core'

import { sql } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { getRouterParam } from 'h3'
import { authorFansStatMaster } from '~~/drizzle/schema'
import { db } from '~~/server/index'

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

function toText(value: string | number | null): string {
  if (value === null) {
    return ''
  }
  return String(value)
}

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

export default defineEventHandler(async (event): Promise<AuthorFansHistoryResponse> => {
  const midParam = getRouterParam(event, 'mid')
  const numericMid = parseMid(midParam)
  if (numericMid === null) {
    return { items: [] }
  }

  const historyTable = getTableIdentifier(authorFansStatMaster)
  const result = await db.execute<AuthorFansHistoryRow>(sql`
    select
      distinct on (date_trunc('day', created_at))
      id::text as id,
      mid::text as mid,
      fans::bigint as fans,
      created_at as created_at,
      rate1::bigint as rate1,
      rate7::bigint as rate7
    from ${historyTable}
    where mid = ${numericMid}
      and created_at is not null
    order by date_trunc('day', created_at) desc, created_at desc, id desc
  `)

  const items = result.rows.map(row => ({
    id: toText(row.id),
    mid: toText(row.mid),
    fans: parseNumber(row.fans),
    createdAt: toTimestamp(row.created_at),
    rate1: parseNumber(row.rate1),
    rate7: parseNumber(row.rate7),
  }))

  return { items }
})
