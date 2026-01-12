import { sql } from 'drizzle-orm'
import { createError, readBody } from 'h3'
import { auth } from '~~/lib/auth'
import { db } from '~~/server/index'

interface CreateCommentBody {
  path?: unknown
  content?: unknown
  parentId?: unknown
}

interface InsertedCommentRow {
  id: string | number | null
}

const MAX_CONTENT_LENGTH = 500
const MAX_PATH_LENGTH = 512

function normalizeBodyValue(value: unknown): string | null {
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
  const raw = normalizeBodyValue(value)
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

function normalizeContent(value: unknown): string | null {
  const raw = normalizeBodyValue(value)
  if (!raw) {
    return null
  }
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }
  if (trimmed.length > MAX_CONTENT_LENGTH) {
    return null
  }
  return trimmed
}

function normalizeId(value: unknown): string | null {
  const raw = normalizeBodyValue(value)
  if (!raw) {
    return null
  }
  const trimmed = raw.trim()
  if (!/^\d+$/.test(trimmed)) {
    return null
  }
  return trimmed
}

export default defineEventHandler(async (event): Promise<{ ok: boolean, id: string }> => {
  const session = await auth.api.getSession({
    headers: event.headers,
  })
  const uid = normalizeId(session?.user?.id)
  if (!uid) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<CreateCommentBody>(event) ?? {}
  const path = normalizePath(body.path)
  const content = normalizeContent(body.content)
  const parentId = normalizeId(body.parentId)

  if (!path) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid path.' })
  }
  if (!content) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid content.' })
  }
  if (body.parentId !== undefined && body.parentId !== null && !parentId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid parent id.' })
  }

  const commentsTable = sql`${sql.identifier('public')}.${sql.identifier('comments')}`

  const result = await db.execute<InsertedCommentRow>(sql`
    insert into ${commentsTable} (path, parent_id, uid, content, created_at, "like", dislike)
    values (${path}, ${parentId}, ${uid}, ${content}, now(), 0, 0)
    returning id::text as id
  `)

  const id = result.rows[0]?.id ? String(result.rows[0].id) : ''

  return { ok: true, id }
})
