import type { AnyPgTable } from 'drizzle-orm/pg-core'

import { sql } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { getQuery } from 'h3'
import { authorInfoMaster, authorLatestFans } from '~~/drizzle/schema'
import { db } from '~~/server/index'

interface AuthorSearchItem {
  mid: string
  name: string | null
  face: string | null
  fans: number
}

interface AuthorSearchResponse {
  items: AuthorSearchItem[]
}

interface AuthorSearchRow extends Record<string, unknown> {
  mid: string | number | null
  name: string | null
  face: string | null
  fans: string | number | null
}

const SEARCH_LIMIT = 20

function parseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

function toText(value: string | number | null): string {
  if (value === null) {
    return ''
  }
  return String(value)
}

function getTableIdentifier(table: AnyPgTable) {
  const config = getTableConfig(table)
  const schemaName = config.schema ?? 'public'
  return sql`${sql.identifier(schemaName)}.${sql.identifier(config.name)}`
}

function normalizeQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const [first] = value
    if (first === null || first === undefined) {
      return undefined
    }
    return typeof first === 'string' || typeof first === 'number' || typeof first === 'boolean'
      ? String(first)
      : undefined
  }
  if (value === null || value === undefined) {
    return undefined
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return undefined
}

function normalizeKeyword(value: unknown): string {
  const normalized = normalizeQueryValue(value)
  if (!normalized) {
    return ''
  }
  return normalized.trim().slice(0, 64)
}

export default defineEventHandler(async (event): Promise<AuthorSearchResponse> => {
  const query = getQuery(event)
  const keyword = normalizeKeyword(query.q ?? query.keyword ?? query.k)
  if (!keyword) {
    return { items: [] }
  }

  const isNumeric = /^\d+$/.test(keyword)
  const infoTable = getTableIdentifier(authorInfoMaster)
  const fansTable = getTableIdentifier(authorLatestFans)
  const maxMid = 9_223_372_036_854_775_807n
  let numericMid: bigint | null = null
  if (isNumeric) {
    try {
      numericMid = BigInt(keyword)
    }
    catch {
      return { items: [] }
    }
    if (numericMid < 0n || numericMid > maxMid) {
      return { items: [] }
    }
  }

  const whereClause = isNumeric && numericMid !== null
    ? sql`i.mid = ${numericMid}`
    : sql`i.name % ${keyword}`
  const orderClause = isNumeric
    ? sql`order by f.fans desc nulls last, i.updated_at desc nulls last`
    : sql`
      order by
        similarity(i.name, ${keyword}) desc,
        f.fans desc nulls last,
        i.updated_at desc nulls last
    `

  const result = await db.execute<AuthorSearchRow>(sql`
    select
      i.mid::text as mid,
      i.name as name,
      i.face as face,
      f.fans::bigint as fans
    from ${infoTable} as i
    left join ${fansTable} as f on f.mid = i.mid
    where ${whereClause}
    ${orderClause}
    limit ${SEARCH_LIMIT}
  `)

  const items = result.rows.map(row => ({
    mid: toText(row.mid),
    name: row.name,
    face: row.face,
    fans: parseNumber(row.fans),
  }))

  return { items }
})
