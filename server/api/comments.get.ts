import { sql } from 'drizzle-orm'
import { getQuery } from 'h3'
import { db } from '~~/server/index'

interface CommentItem {
  id: string
  uid: string | null
  name: string | null
  avatar: string | null
  content: string | null
  createdAt: string | null
  likes: number
  dislikes: number
}

interface CommentsResponse {
  path: string
  total: number
  items: CommentItem[]
}

interface CommentRow extends Record<string, unknown> {
  id: string | number | null
  parent_id: string | number | null
  uid: string | number | null
  name: string | null
  avatar: string | null
  content: string | null
  created_at: string | Date | null
  likes: string | number | null
  dislikes: string | number | null
}

interface CountRow {
  count: string | number | null
}

const DEFAULT_LIMIT = 30
const MAX_LIMIT = 100
const QUERY_LIMIT_MULTIPLIER = 3
const MAX_PATH_LENGTH = 512

function normalizeQueryValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    const [first] = value
    if (first === null || first === undefined) {
      return null
    }
    if (typeof first === 'string' || typeof first === 'number' || typeof first === 'boolean') {
      return String(first)
    }
    return null
  }
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return null
}

function normalizePath(value: unknown): string | null {
  const raw = normalizeQueryValue(value)
  if (!raw) {
    return null
  }
  const trimmed = raw.trim()
  if (!trimmed) {
    return '/'
  }
  if (trimmed.length > MAX_PATH_LENGTH) {
    return null
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function normalizeLimit(value: unknown): number {
  const raw = normalizeQueryValue(value)
  if (!raw) {
    return DEFAULT_LIMIT
  }
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT
  }
  return Math.min(Math.max(parsed, 1), MAX_LIMIT)
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

function toText(value: string | number | null): string | null {
  if (value === null) {
    return null
  }
  return String(value)
}

function formatTimestamp(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  return value
}

function buildDedupeKey(row: CommentRow): string {
  const uid = row.uid ?? ''
  const parentId = row.parent_id ?? ''
  const content = row.content ?? ''
  return `${uid}\n${parentId}\n${content}`
}

export default defineEventHandler(async (event): Promise<CommentsResponse> => {
  const query = getQuery(event)
  const path = normalizePath(query.path)
  if (!path) {
    return { path: '', total: 0, items: [] }
  }
  const limit = normalizeLimit(query.limit)
  const queryLimit = Math.min(limit * QUERY_LIMIT_MULTIPLIER, MAX_LIMIT * QUERY_LIMIT_MULTIPLIER)

  const commentsTable = sql`${sql.identifier('public')}.${sql.identifier('comments')}`
  const usersTable = sql`${sql.identifier('public')}.${sql.identifier('user')}`

  const totalResult = await db.execute<CountRow>(sql`
    select count(*)::bigint as count
    from ${commentsTable}
    where path = ${path}
  `)
  const total = parseNumber(totalResult.rows[0]?.count ?? 0)

  const result = await db.execute<CommentRow>(sql`
    select
      c.id::text as id,
      c.parent_id::text as parent_id,
      c.uid::text as uid,
      c.content as content,
      c.created_at as created_at,
      c."like"::bigint as likes,
      c."dislike"::bigint as dislikes,
      u.name as name,
      u.image as avatar
    from ${commentsTable} as c
    left join ${usersTable} as u on u.id = c.uid
    where c.path = ${path}
    order by c.created_at desc nulls last, c.id desc
    limit ${queryLimit}
  `)

  const items: CommentItem[] = []
  let lastKey: string | null = null
  for (const row of result.rows) {
    const key = buildDedupeKey(row)
    if (key === lastKey) {
      continue
    }
    lastKey = key
    items.push({
      id: toText(row.id) ?? '',
      uid: toText(row.uid),
      name: row.name,
      avatar: row.avatar,
      content: row.content,
      createdAt: formatTimestamp(row.created_at),
      likes: parseNumber(row.likes),
      dislikes: parseNumber(row.dislikes),
    })
    if (items.length >= limit) {
      break
    }
  }

  return { path, total, items }
})
