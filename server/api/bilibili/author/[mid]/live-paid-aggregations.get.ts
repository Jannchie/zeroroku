import type { AnyPgTable } from 'drizzle-orm/pg-core'

import { sql } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { getRouterParam } from 'h3'
import { livers } from '~~/drizzle/schema'
import { db } from '~~/server/index'

type AggregationItem = Record<string, string | number | null>

interface LivePaidEventAggregationResponse {
  roomId: string | null
  columns: string[]
  items: AggregationItem[]
}

interface ColumnRow {
  column_name: string | null
  data_type: string | null
  udt_name: string | null
}

interface RoomRow {
  room_id: string | number | null
}

const TABLE_NAME = 'live_paid_event_aggregations'
const TABLE_SCHEMA = 'public'
const CACHE_TTL_MS = 60_000
const AGGREGATION_TIMEZONE = 'Asia/Shanghai'

const cachedResults = new Map<string, { data: LivePaidEventAggregationResponse, expiresAt: number }>()
const inFlight = new Map<string, Promise<LivePaidEventAggregationResponse>>()

const MIN_MID = 0n
const MAX_MID = 9_223_372_036_854_775_807n
const HIDDEN_COLUMN_KEYS = new Set(['id', 'roomid'])
const BUCKET_START_ALIAS = 'bucket_start'
const NUMERIC_DATA_TYPES = new Set([
  'smallint',
  'integer',
  'bigint',
  'decimal',
  'numeric',
  'real',
  'double precision',
])
const NUMERIC_UDT_TYPES = new Set([
  'int2',
  'int4',
  'int8',
  'numeric',
  'float4',
  'float8',
])

function normalizeColumnKey(value: string): string {
  return value.replaceAll(/[^a-z0-9]/gi, '').toLowerCase()
}

function isNumericColumn(row: ColumnRow): boolean {
  const dataType = row.data_type?.toLowerCase() ?? ''
  const udtName = row.udt_name?.toLowerCase() ?? ''
  return NUMERIC_DATA_TYPES.has(dataType) || NUMERIC_UDT_TYPES.has(udtName)
}

function normalizeValue(value: unknown): string | number | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'bigint') {
    return value.toString()
  }
  if (typeof value === 'string') {
    return value
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  return String(value)
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

function pickColumn(columns: string[], candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (columns.includes(candidate)) {
      return candidate
    }
  }
  return null
}

function cacheKey(mid: bigint): string {
  return mid.toString()
}

function getCachedResult(key: string): LivePaidEventAggregationResponse | null {
  const cached = cachedResults.get(key)
  if (!cached) {
    return null
  }
  if (Date.now() >= cached.expiresAt) {
    cachedResults.delete(key)
    return null
  }
  return cached.data
}

async function resolveRoomId(mid: bigint): Promise<string | null> {
  const liversTable = getTableIdentifier(livers)
  const result = await db.execute<RoomRow>(sql`
    select room_id::text as room_id
    from ${liversTable}
    where mid = ${mid}
    limit 1
  `)
  const roomId = result.rows[0]?.room_id
  if (roomId === null || roomId === undefined) {
    return null
  }
  const text = String(roomId).trim()
  return text.length > 0 ? text : null
}

async function loadAggregations(mid: bigint): Promise<LivePaidEventAggregationResponse> {
  const roomId = await resolveRoomId(mid)
  if (!roomId) {
    return { roomId: null, columns: [], items: [] }
  }

  const columnsResult = await db.execute<ColumnRow>(sql`
    select column_name, data_type, udt_name
    from information_schema.columns
    where table_schema = ${TABLE_SCHEMA}
      and table_name = ${TABLE_NAME}
    order by ordinal_position
  `)

  const columnRows = columnsResult.rows.filter(
    (row): row is ColumnRow & { column_name: string } =>
      typeof row.column_name === 'string' && row.column_name.length > 0,
  )
  const columns = columnRows.map(row => row.column_name)

  if (columns.length === 0) {
    return { roomId, columns: [], items: [] }
  }

  const timeColumn = pickColumn(
    columns,
    ['bucket_start', 'bucketStart', 'timestamp', 'created_at', 'createdAt', 'created_time', 'createdTime', 'time'],
  )
  const roomColumn = pickColumn(columns, ['room_id', 'roomId'])

  if (!timeColumn || !roomColumn) {
    return { roomId, columns: [], items: [] }
  }

  const numericColumns = columnRows
    .filter(row => isNumericColumn(row))
    .map(row => row.column_name)
    .filter((column) => {
      const normalized = normalizeColumnKey(column)
      if (normalized === normalizeColumnKey(timeColumn)) {
        return false
      }
      if (normalized === normalizeColumnKey(roomColumn)) {
        return false
      }
      if (HIDDEN_COLUMN_KEYS.has(normalized)) {
        return false
      }
      return true
    })

  if (numericColumns.length === 0) {
    return { roomId, columns: [], items: [] }
  }

  const tableIdentifier = sql`${sql.identifier(TABLE_SCHEMA)}.${sql.identifier(TABLE_NAME)}`
  const timeIdentifier = sql.identifier(timeColumn)
  const roomIdentifier = sql.identifier(roomColumn)

  const roomFilter = sql`${roomIdentifier} = ${roomId}`
  const timeColumnRow = columnRows.find(row => row.column_name === timeColumn)
  const timeDataType = timeColumnRow?.data_type?.toLowerCase() ?? ''
  const timeUdtName = timeColumnRow?.udt_name?.toLowerCase() ?? ''
  const isDateType = timeDataType === 'date'
  const isTimestampWithoutTimeZone = timeDataType === 'timestamp without time zone' || timeUdtName === 'timestamp'
  const isTimestampWithTimeZone = timeDataType === 'timestamp with time zone' || timeUdtName === 'timestamptz'
  const isTextType = timeDataType === 'text'
    || timeDataType === 'character varying'
    || timeDataType === 'character'
  const isNumericTimeType = NUMERIC_DATA_TYPES.has(timeDataType) || NUMERIC_UDT_TYPES.has(timeUdtName)
  let timeExpression = sql`${timeIdentifier}`
  if (!isDateType) {
    if (isNumericTimeType) {
      timeExpression = sql`to_timestamp(
        case
          when ${timeIdentifier} > 1000000000000 then ${timeIdentifier} / 1000.0
          else ${timeIdentifier}
        end
      ) AT TIME ZONE ${AGGREGATION_TIMEZONE}`
    }
    else if (isTimestampWithoutTimeZone) {
      timeExpression = sql`(${timeIdentifier} AT TIME ZONE 'UTC') AT TIME ZONE ${AGGREGATION_TIMEZONE}`
    }
    else if (isTimestampWithTimeZone) {
      timeExpression = sql`${timeIdentifier} AT TIME ZONE ${AGGREGATION_TIMEZONE}`
    }
    else if (isTextType) {
      timeExpression = sql`(${timeIdentifier})::timestamptz AT TIME ZONE ${AGGREGATION_TIMEZONE}`
    }
    else {
      timeExpression = sql`${timeIdentifier} AT TIME ZONE ${AGGREGATION_TIMEZONE}`
    }
  }
  const groupByExpr = isDateType ? sql`${timeIdentifier}` : sql`date(${timeExpression})`

  const outputColumns = [BUCKET_START_ALIAS, ...numericColumns]
  const runQuery = async (groupByClause: typeof groupByExpr) => {
    const selectFragments = [
      sql`to_char(${groupByClause}, 'YYYY-MM-DD') as ${sql.identifier(BUCKET_START_ALIAS)}`,
      ...numericColumns.map(column => sql`sum(${sql.identifier(column)}) as ${sql.identifier(column)}`),
    ]
    return db.execute<Record<string, unknown>>(sql`
      select ${sql.join(selectFragments, sql`, `)}
      from ${tableIdentifier}
      where ${roomFilter}
      group by ${groupByClause}
      order by ${groupByClause} desc nulls last
    `)
  }

  let rows: Record<string, unknown>[] = []
  try {
    const result = await runQuery(groupByExpr)
    rows = result.rows
  }
  catch {
    try {
      const fallbackGroupByExpr = sql`date_trunc('day', ${timeIdentifier})`
      const result = await runQuery(fallbackGroupByExpr)
      rows = result.rows
    }
    catch {
      return { roomId, columns: outputColumns, items: [] }
    }
  }

  const items = rows.map((row) => {
    const normalized: AggregationItem = {}
    for (const column of outputColumns) {
      normalized[column] = normalizeValue(row[column])
    }
    return normalized
  })

  return {
    roomId,
    columns: outputColumns,
    items,
  }
}

export default defineEventHandler(async (event): Promise<LivePaidEventAggregationResponse> => {
  const midParam = getRouterParam(event, 'mid')
  const numericMid = parseMid(midParam)

  if (numericMid === null) {
    return { roomId: null, columns: [], items: [] }
  }

  const key = cacheKey(numericMid)
  const cached = getCachedResult(key)
  if (cached) {
    return cached
  }

  const existing = inFlight.get(key)
  if (existing) {
    return existing
  }

  const promise = loadAggregations(numericMid)
  inFlight.set(key, promise)

  try {
    const result = await promise
    cachedResults.set(key, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })
    return result
  }
  catch {
    return { roomId: null, columns: [], items: [] }
  }
  finally {
    inFlight.delete(key)
  }
})
