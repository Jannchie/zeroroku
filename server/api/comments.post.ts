import type { AnyPgTable } from 'drizzle-orm/pg-core'

import { sql } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { createError, readBody } from 'h3'
import { comments } from '~~/drizzle/schema'
import { auth } from '~~/lib/auth'
import { db } from '~~/server/index'
import { applyCreditChange } from '~~/server/utils/credit'

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
const COMMENT_COST = 1
const COMMENT_EXP = 1

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

function getTableIdentifier(table: AnyPgTable) {
  const config = getTableConfig(table)
  const schemaName = config.schema ?? 'public'
  return sql`${sql.identifier(schemaName)}.${sql.identifier(config.name)}`
}

export default defineEventHandler(async (event): Promise<{ ok: boolean, id: string }> => {
  const session = await auth.api.getSession({
    headers: event.headers,
  })
  const userId = parseUserId(session?.user?.id)
  if (!userId) {
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

  const commentsTable = getTableIdentifier(comments)
  const now = new Date()

  const result = await db.transaction(async (tx) => {
    await applyCreditChange(tx, {
      userId,
      creditDelta: -COMMENT_COST,
      expDelta: COMMENT_EXP,
      text: '评论',
      createdAt: now,
      data: {
        type: 'comment',
        path,
        parentId,
      },
    })

    return tx.execute<InsertedCommentRow>(sql`
      insert into ${commentsTable} (path, parent_id, uid, content, created_at, "like", dislike)
      values (${path}, ${parentId}, ${userId}, ${content}, ${now}, 0, 0)
      returning id::text as id
    `)
  })

  const id = result.rows[0]?.id ? String(result.rows[0].id) : ''

  return { ok: true, id }
})
