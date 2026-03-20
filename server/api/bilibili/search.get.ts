import { sql } from 'drizzle-orm'
import { getQuery } from 'h3'
import { authorInfoMaster, authorLatestFans } from '~~/drizzle/schema'
import { db } from '~~/server/index'
import { parseNumberOrZero, parseUnsignedBigInt, toText } from '~~/server/utils/parsers'
import { getTableIdentifier } from '~~/server/utils/table'

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
  const numericMid = isNumeric ? parseUnsignedBigInt(keyword) : null
  if (isNumeric && numericMid === null) {
    return { items: [] }
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
    fans: parseNumberOrZero(row.fans),
  }))

  return { items }
})
