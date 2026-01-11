import type { AnyPgTable } from 'drizzle-orm/pg-core'

import { sql } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { authorInfoMaster, authorVisitRecords } from '~~/drizzle/schema'
import { db } from '~~/server/index'

interface VisitTopItem {
  mid: string
  name: string | null
  face: string | null
  visits: number
}

interface VisitTopResponse {
  items: VisitTopItem[]
}

interface VisitTopRow extends Record<string, unknown> {
  mid: string | number | null
  name: string | null
  face: string | null
  visits: string | number | null
}

const VISIT_DAYS = 30
const VISIT_LIMIT = 16

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

export default defineEventHandler(async (): Promise<VisitTopResponse> => {
  const visitsTable = getTableIdentifier(authorVisitRecords)
  const infoTable = getTableIdentifier(authorInfoMaster)
  const since = new Date(Date.now() - VISIT_DAYS * 24 * 60 * 60 * 1000)
  const result = await db.execute<VisitTopRow>(sql`
    select
      t.mid::text as mid,
      i.name as name,
      i.face as face,
      t.visits::bigint as visits
    from (
      select
        v.mid,
        count(*) as visits
      from ${visitsTable} as v
      where v.mid is not null
        and v.created_at >= ${since.toISOString()}
      group by v.mid
      order by count(*) desc nulls last, v.mid asc
      limit ${VISIT_LIMIT}
    ) as t
    left join ${infoTable} as i on i.mid = t.mid
    order by t.visits desc nulls last, t.mid asc
  `)

  const items = result.rows.map(row => ({
    mid: toText(row.mid),
    name: row.name,
    face: row.face,
    visits: parseNumber(row.visits),
  }))

  return { items }
})
