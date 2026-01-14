import type { AnyPgTable } from 'drizzle-orm/pg-core'

import { sql } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { sponsors } from '~~/lib/database/auth-schema'
import { db } from '~~/server/index'

interface SponsorItem {
  id: string
  name: string
  amount: number
  sponsoredAt: string
}

interface SponsorResponse {
  items: SponsorItem[]
}

interface SponsorRow extends Record<string, unknown> {
  name: string | null
  amount: string | number | null
  sponsored_at: string | Date | null
}

const CACHE_TTL_MS = 300_000
let cachedSponsors: SponsorResponse | null = null
let cacheExpiresAt = 0
let inFlight: Promise<SponsorResponse> | null = null

function getCachedSponsors(): SponsorResponse | null {
  if (!cachedSponsors) {
    return null
  }
  if (Date.now() >= cacheExpiresAt) {
    return null
  }
  return cachedSponsors
}

function parseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function toText(value: string | number | null): string {
  if (value === null) {
    return ''
  }
  return String(value)
}

function toIsoString(value: string | Date | null): string {
  if (!value) {
    return ''
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  return value
}

function getTableIdentifier(table: AnyPgTable) {
  const config = getTableConfig(table)
  const schemaName = config.schema ?? 'public'
  return sql`${sql.identifier(schemaName)}.${sql.identifier(config.name)}`
}

async function loadSponsors(): Promise<SponsorResponse> {
  const sponsorsTable = getTableIdentifier(sponsors)
  const result = await db.execute<SponsorRow>(sql`
    select
      nullif(trim(user_name), '') as name,
      sum(amount) as amount,
      max(sponsored_at) as sponsored_at
    from ${sponsorsTable}
    group by nullif(trim(user_name), '')
    order by max(sponsored_at) desc nulls last, sum(amount) desc nulls last
  `)

  const items = result.rows.map((row) => {
    const name = row.name ?? ''
    const id = name ? toText(name) : 'anonymous'
    return {
      id,
      name,
      amount: parseNumber(row.amount),
      sponsoredAt: toIsoString(row.sponsored_at),
    }
  })

  return { items }
}

export default defineEventHandler(async (): Promise<SponsorResponse> => {
  const cached = getCachedSponsors()
  if (cached) {
    return cached
  }

  if (!inFlight) {
    inFlight = loadSponsors()
  }

  try {
    const sponsors = await inFlight
    cachedSponsors = sponsors
    cacheExpiresAt = Date.now() + CACHE_TTL_MS
    return sponsors
  }
  finally {
    inFlight = null
  }
})
