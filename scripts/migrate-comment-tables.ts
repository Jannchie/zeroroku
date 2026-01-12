import { Client } from 'pg'
import 'dotenv/config'

const TABLES = ['comment_attitudes', 'comments'] as const

const DEFAULT_SCHEMA = 'public'
const DEFAULT_BATCH_SIZE = 2000

interface ColumnInfo {
  name: string
  type: string
  notNull: boolean
  defaultValue: string | null
  identity: '' | 'a' | 'd'
  generated: '' | 's'
}

interface ColumnRow {
  column_name: string
  data_type: string
  not_null: boolean
  default_value: string | null
  identity: string | null
  generated: string | null
}

interface SequenceDependencyRow {
  sequence_schema: string
  sequence_name: string
  column_name: string
}

interface SequenceInfoRow {
  start_value: string
  min_value: string
  max_value: string
  increment_by: string
  cache_size: string
  cycle: boolean
}

interface SequenceDependency {
  schema: string
  name: string
  column: string
}

interface SequenceInfo {
  schema: string
  name: string
  column: string
  startValue: string
  minValue: string
  maxValue: string
  incrementBy: string
  cacheSize: string
  cycle: boolean
}

interface ConstraintRow {
  conname: string
  contype: string
  definition: string
}

interface IndexRow {
  index_name: string
  indexdef: string
  is_primary: boolean
}

interface QueryResult<T> {
  rows: T[]
  rowCount: number | null
}

const parseDatabaseName = (connectionString: string): string => {
  const url = new URL(connectionString)
  return url.pathname.replace(/^\//, '')
}

const buildConnectionString = (connectionString: string, database: string): string => {
  const url = new URL(connectionString)
  url.pathname = `/${database}`
  return url.toString()
}

const parseBatchSize = (value: string | undefined): number => {
  if (!value) {
    return DEFAULT_BATCH_SIZE
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('BATCH_SIZE must be a positive number.')
  }
  return parsed
}

const requireEnv = (value: string | undefined, message: string): string => {
  if (!value) {
    throw new Error(message)
  }
  return value
}

const quoteIdent = (value: string): string => `"${value.replace(/"/g, '""')}"`

const qualify = (schema: string, name: string): string => `${quoteIdent(schema)}.${quoteIdent(name)}`

const rewriteSchemaInSql = (value: string, sourceSchema: string, targetSchema: string): string => {
  if (sourceSchema === targetSchema) {
    return value
  }
  const plain = `${sourceSchema}.`
  const quoted = `"${sourceSchema}".`
  return value.replaceAll(plain, `${targetSchema}.`).replaceAll(quoted, `"${targetSchema}".`)
}

const mapSchema = (schema: string, sourceSchema: string, targetSchema: string): string => (
  schema === sourceSchema ? targetSchema : schema
)

const parseIdentity = (value: string | null): ColumnInfo['identity'] => {
  if (value === 'a' || value === 'd') {
    return value
  }
  return ''
}

const parseGenerated = (value: string | null): ColumnInfo['generated'] => {
  if (value === 's') {
    return 's'
  }
  return ''
}

const shouldIncludeForeignKeys = (value: string | undefined): boolean => {
  if (!value) {
    return false
  }
  return value === '1' || value.toLowerCase() === 'true'
}

const addIfNotExistsToIndex = (definition: string): string => {
  if (definition.startsWith('CREATE UNIQUE INDEX ')) {
    return definition.replace('CREATE UNIQUE INDEX ', 'CREATE UNIQUE INDEX IF NOT EXISTS ')
  }
  if (definition.startsWith('CREATE INDEX ')) {
    return definition.replace('CREATE INDEX ', 'CREATE INDEX IF NOT EXISTS ')
  }
  return definition
}

async function connect(connectionString: string): Promise<Client> {
  const client = new Client({ connectionString })
  await client.connect()
  return client
}

async function ensureSchema(client: Client, schema: string): Promise<void> {
  await client.query(`create schema if not exists ${quoteIdent(schema)}`)
}

async function tableExists(client: Client, schema: string, table: string): Promise<boolean> {
  const result = await client.query(
    `
      select 1
      from information_schema.tables
      where table_schema = $1 and table_name = $2
      limit 1
    `,
    [schema, table],
  ) as QueryResult<{}>
  return result.rowCount !== null && result.rowCount > 0
}

async function countRows(client: Client, schema: string, table: string): Promise<number> {
  const result = await client.query<{ count: string }>(
    `select count(*)::text as count from ${qualify(schema, table)}`,
  )
  const count = result.rows[0]?.count ?? '0'
  return Number(count)
}

async function getColumns(client: Client, schema: string, table: string): Promise<ColumnInfo[]> {
  const result = await client.query<ColumnRow>(
    `
      select
        a.attname as column_name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
        a.attnotnull as not_null,
        pg_get_expr(ad.adbin, ad.adrelid) as default_value,
        a.attidentity as identity,
        a.attgenerated as generated
      from pg_attribute a
      left join pg_attrdef ad
        on a.attrelid = ad.adrelid
        and a.attnum = ad.adnum
      where a.attrelid = $1::regclass
        and a.attnum > 0
        and not a.attisdropped
      order by a.attnum
    `,
    [`${schema}.${table}`],
  )
  return result.rows.map(row => ({
    name: row.column_name,
    type: row.data_type,
    notNull: row.not_null,
    defaultValue: row.default_value,
    identity: parseIdentity(row.identity),
    generated: parseGenerated(row.generated),
  }))
}

async function getSequenceDependencies(
  client: Client,
  schema: string,
  table: string,
): Promise<SequenceDependency[]> {
  const result = await client.query<SequenceDependencyRow>(
    `
      select
        n.nspname as sequence_schema,
        s.relname as sequence_name,
        a.attname as column_name
      from pg_class s
      join pg_namespace n on n.oid = s.relnamespace
      join pg_depend d on d.objid = s.oid and d.deptype = 'a'
      join pg_class t on d.refobjid = t.oid
      join pg_attribute a on a.attrelid = t.oid and a.attnum = d.refobjsubid
      where s.relkind = 'S'
        and t.oid = $1::regclass
    `,
    [`${schema}.${table}`],
  )
  return result.rows.map(row => ({
    schema: row.sequence_schema,
    name: row.sequence_name,
    column: row.column_name,
  }))
}

async function getSequenceInfo(
  client: Client,
  sequenceSchema: string,
  sequenceName: string,
): Promise<SequenceInfoRow | null> {
  const result = await client.query<SequenceInfoRow>(
    `
      select start_value, min_value, max_value, increment_by, cache_size, cycle
      from pg_sequences
      where schemaname = $1 and sequencename = $2
    `,
    [sequenceSchema, sequenceName],
  )
  return result.rows[0] ?? null
}

function buildSequenceInfo(
  row: SequenceInfoRow,
  dependency: SequenceDependency,
  sourceSchema: string,
  targetSchema: string,
): SequenceInfo {
  const mappedSchema = mapSchema(dependency.schema, sourceSchema, targetSchema)
  return {
    schema: mappedSchema,
    name: dependency.name,
    column: dependency.column,
    startValue: row.start_value,
    minValue: row.min_value,
    maxValue: row.max_value,
    incrementBy: row.increment_by,
    cacheSize: row.cache_size,
    cycle: row.cycle,
  }
}

async function createSequence(client: Client, sequence: SequenceInfo): Promise<void> {
  const sequenceName = qualify(sequence.schema, sequence.name)
  const cycle = sequence.cycle ? 'cycle' : 'no cycle'
  await client.query(
    `
      create sequence if not exists ${sequenceName}
      increment by ${sequence.incrementBy}
      minvalue ${sequence.minValue}
      maxvalue ${sequence.maxValue}
      start with ${sequence.startValue}
      cache ${sequence.cacheSize}
      ${cycle}
    `,
  )
}

async function setSequenceOwnership(
  client: Client,
  sequence: SequenceInfo,
  tableSchema: string,
  tableName: string,
): Promise<void> {
  const sequenceName = qualify(sequence.schema, sequence.name)
  const tableQualified = qualify(tableSchema, tableName)
  await client.query(
    `alter sequence ${sequenceName} owned by ${tableQualified}.${quoteIdent(sequence.column)}`,
  )
}

function buildColumnDefinition(
  column: ColumnInfo,
  sourceSchema: string,
  targetSchema: string,
): string {
  const parts: string[] = [quoteIdent(column.name), column.type]

  if (column.generated === 's') {
    if (!column.defaultValue) {
      throw new Error(`Generated column ${column.name} is missing its expression.`)
    }
    const expression = rewriteSchemaInSql(column.defaultValue, sourceSchema, targetSchema)
    parts.push(`generated always as (${expression}) stored`)
  }
  else if (column.identity === 'a') {
    parts.push('generated always as identity')
  }
  else if (column.identity === 'd') {
    parts.push('generated by default as identity')
  }
  else if (column.defaultValue) {
    const defaultValue = rewriteSchemaInSql(column.defaultValue, sourceSchema, targetSchema)
    parts.push(`default ${defaultValue}`)
  }

  if (column.notNull) {
    parts.push('not null')
  }

  return parts.join(' ')
}

async function createTableFromSource(
  client: Client,
  schema: string,
  table: string,
  columns: ColumnInfo[],
  sourceSchema: string,
  targetSchema: string,
): Promise<void> {
  const columnSql = columns
    .map(column => buildColumnDefinition(column, sourceSchema, targetSchema))
    .join(',\n  ')

  const createSql = `create table if not exists ${qualify(schema, table)} (\n  ${columnSql}\n)`
  await client.query(createSql)
}

async function getPrimaryKeyColumns(client: Client, schema: string, table: string): Promise<string[]> {
  const result = await client.query<{ column_name: string }>(
    `
      select a.attname as column_name
      from pg_index i
      join unnest(i.indkey) with ordinality as k(attnum, ord) on true
      join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
      where i.indrelid = $1::regclass
        and i.indisprimary
      order by k.ord
    `,
    [`${schema}.${table}`],
  )
  return result.rows.map(row => row.column_name)
}

function buildInsert(
  schema: string,
  table: string,
  columns: string[],
  rows: Record<string, unknown>[],
  useOverride: boolean,
): { text: string, values: unknown[] } {
  const values: unknown[] = []
  const columnSql = columns.map(column => quoteIdent(column)).join(', ')
  const tableSql = qualify(schema, table)
  const overrideClause = useOverride ? ' overriding system value' : ''

  const rowsSql = rows.map((row, rowIndex) => {
    const placeholders = columns.map((column, columnIndex) => {
      values.push(row[column])
      return `$${rowIndex * columns.length + columnIndex + 1}`
    })
    return `(${placeholders.join(', ')})`
  })

  const text = `insert into ${tableSql}${overrideClause} (${columnSql}) values ${rowsSql.join(', ')} on conflict do nothing`
  return { text, values }
}

function buildSelect(
  schema: string,
  table: string,
  columns: string[],
  orderColumns: string[],
  lastKey: unknown[] | null,
  batchSize: number,
): { text: string, values: unknown[] } {
  const values: unknown[] = []
  const columnSql = columns.map(column => quoteIdent(column)).join(', ')
  const tableSql = qualify(schema, table)
  let text = `select ${columnSql} from ${tableSql}`

  if (orderColumns.length > 0 && lastKey) {
    const orderSql = orderColumns.map(column => quoteIdent(column)).join(', ')
    const placeholders = orderColumns.map((_, index) => `$${index + 1}`).join(', ')
    values.push(...lastKey)
    text += ` where (${orderSql}) > (${placeholders})`
  }

  if (orderColumns.length > 0) {
    const orderSql = orderColumns.map(column => quoteIdent(column)).join(', ')
    text += ` order by ${orderSql}`
  }

  text += ` limit ${batchSize}`
  return { text, values }
}

async function insertRows(
  client: Client,
  schema: string,
  table: string,
  columns: string[],
  rows: Record<string, unknown>[],
  useOverride: boolean,
): Promise<void> {
  if (rows.length === 0) {
    return
  }
  const insert = buildInsert(schema, table, columns, rows, useOverride)
  await client.query(insert.text, insert.values)
}

async function copyTable(
  source: Client,
  target: Client,
  schema: string,
  table: string,
  selectColumns: string[],
  insertColumns: string[],
  orderColumns: string[],
  useOverride: boolean,
  batchSize: number,
): Promise<number> {
  let totalCopied = 0
  let lastKey: unknown[] | null = null

  if (orderColumns.length === 0) {
    console.warn(`Table ${schema}.${table} has no primary key. Using offset-based pagination.`)
    let offset = 0
    while (true) {
      const columnSql = selectColumns.map(column => quoteIdent(column)).join(', ')
      const tableSql = qualify(schema, table)
      const result = await source.query<Record<string, unknown>>(
        `select ${columnSql} from ${tableSql} offset $1 limit $2`,
        [offset, batchSize],
      )
      if (result.rows.length === 0) {
        break
      }
      await insertRows(target, schema, table, insertColumns, result.rows, useOverride)
      totalCopied += result.rows.length
      offset += result.rows.length
    }
    return totalCopied
  }

  while (true) {
    const select = buildSelect(schema, table, selectColumns, orderColumns, lastKey, batchSize)
    const result = await source.query<Record<string, unknown>>(select.text, select.values)
    if (result.rows.length === 0) {
      break
    }
    await insertRows(target, schema, table, insertColumns, result.rows, useOverride)
    totalCopied += result.rows.length
    const lastRow = result.rows.at(-1)
    if (lastRow) {
      lastKey = orderColumns.map(column => lastRow[column])
    }
  }

  return totalCopied
}

async function getConstraints(client: Client, schema: string, table: string): Promise<ConstraintRow[]> {
  const result = await client.query<ConstraintRow>(
    `
      select conname, contype, pg_get_constraintdef(oid) as definition
      from pg_constraint
      where conrelid = $1::regclass
    `,
    [`${schema}.${table}`],
  )
  return result.rows
}

async function constraintExists(
  client: Client,
  schema: string,
  table: string,
  constraintName: string,
): Promise<boolean> {
  const result = await client.query(
    `
      select 1
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = $1 and t.relname = $2 and c.conname = $3
      limit 1
    `,
    [schema, table, constraintName],
  ) as QueryResult<{}>
  return result.rowCount !== null && result.rowCount > 0
}

async function applyConstraints(
  client: Client,
  schema: string,
  table: string,
  constraints: ConstraintRow[],
  includeForeignKeys: boolean,
  sourceSchema: string,
  targetSchema: string,
): Promise<void> {
  for (const constraint of constraints) {
    if (constraint.contype === 'f' && !includeForeignKeys) {
      continue
    }
    const exists = await constraintExists(client, schema, table, constraint.conname)
    if (exists) {
      continue
    }
    const definition = rewriteSchemaInSql(constraint.definition, sourceSchema, targetSchema)
    await client.query(
      `alter table ${qualify(schema, table)} add constraint ${quoteIdent(constraint.conname)} ${definition}`,
    )
  }
}

async function getConstraintIndexNames(client: Client, schema: string, table: string): Promise<Set<string>> {
  const result = await client.query<{ index_name: string }>(
    `
      select conindid::regclass::text as index_name
      from pg_constraint
      where conrelid = $1::regclass
        and conindid <> 0
    `,
    [`${schema}.${table}`],
  )
  return new Set(result.rows.map(row => row.index_name))
}

async function getIndexes(client: Client, schema: string, table: string): Promise<IndexRow[]> {
  const result = await client.query<IndexRow>(
    `
      select
        c.relname as index_name,
        pg_get_indexdef(i.indexrelid) as indexdef,
        i.indisprimary as is_primary
      from pg_index i
      join pg_class c on c.oid = i.indexrelid
      join pg_class t on t.oid = i.indrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = $1 and t.relname = $2
    `,
    [schema, table],
  )
  return result.rows
}

async function applyIndexes(
  client: Client,
  schema: string,
  table: string,
  indexes: IndexRow[],
  constraintIndexNames: Set<string>,
  sourceSchema: string,
  targetSchema: string,
): Promise<void> {
  for (const index of indexes) {
    if (index.is_primary || constraintIndexNames.has(index.index_name)) {
      continue
    }
    const rewritten = rewriteSchemaInSql(index.indexdef, sourceSchema, targetSchema)
    const sql = addIfNotExistsToIndex(rewritten)
    await client.query(sql)
  }
}

async function resetSequences(
  client: Client,
  schema: string,
  table: string,
  columns: string[],
): Promise<void> {
  for (const column of columns) {
    const result = await client.query<{ seq: string | null }>(
      'select pg_get_serial_sequence($1, $2) as seq',
      [`${schema}.${table}`, column],
    )
    const sequence = result.rows[0]?.seq
    if (!sequence) {
      continue
    }
    const columnSql = quoteIdent(column)
    const tableSql = qualify(schema, table)
    await client.query(
      `select setval($1::regclass, coalesce((select max(${columnSql}) from ${tableSql}), 0))`,
      [sequence],
    )
  }
}

async function run(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required.')
  }

  const sourceDatabaseUrl = process.env.SOURCE_DATABASE_URL
  const sourceDatabase = process.env.SOURCE_DATABASE

  const targetDatabase = process.env.TARGET_DATABASE ?? parseDatabaseName(databaseUrl)
  if (!targetDatabase) {
    throw new Error('TARGET_DATABASE is missing or invalid.')
  }

  const sourceSchema = process.env.SOURCE_SCHEMA ?? DEFAULT_SCHEMA
  const targetSchema = process.env.TARGET_SCHEMA ?? DEFAULT_SCHEMA
  const includeForeignKeys = shouldIncludeForeignKeys(process.env.INCLUDE_FOREIGN_KEYS)
  const batchSize = parseBatchSize(process.env.BATCH_SIZE)

  const sourceConnectionString = sourceDatabaseUrl
    ?? buildConnectionString(
      databaseUrl,
      requireEnv(sourceDatabase, 'Set SOURCE_DATABASE or SOURCE_DATABASE_URL for the comment tables source.'),
    )
  const targetConnectionString = buildConnectionString(databaseUrl, targetDatabase)

  if (!sourceConnectionString || !targetConnectionString) {
    throw new Error('Source or target connection string is invalid.')
  }

  if (sourceConnectionString === targetConnectionString && sourceSchema === targetSchema) {
    throw new Error('Source and target are identical. Aborting to avoid self-copy.')
  }

  const source = await connect(sourceConnectionString)
  const target = await connect(targetConnectionString)

  try {
    await ensureSchema(target, targetSchema)

    for (const table of TABLES) {
      const sourceExists = await tableExists(source, sourceSchema, table)
      if (!sourceExists) {
        throw new Error(`Source table ${sourceSchema}.${table} does not exist.`)
      }

      const targetExists = await tableExists(target, targetSchema, table)
      const columns = await getColumns(source, sourceSchema, table)
      const identityColumns = new Set(columns.filter(column => column.identity !== '').map(column => column.name))
      const dependencies = await getSequenceDependencies(source, sourceSchema, table)
      const sequencesToCreate = dependencies.filter(dep => !identityColumns.has(dep.column))

      const sequences: SequenceInfo[] = []
      for (const dependency of sequencesToCreate) {
        const sequenceInfo = await getSequenceInfo(source, dependency.schema, dependency.name)
        if (!sequenceInfo) {
          continue
        }
        sequences.push(buildSequenceInfo(sequenceInfo, dependency, sourceSchema, targetSchema))
      }

      for (const sequence of sequences) {
        await createSequence(target, sequence)
      }

      if (!targetExists) {
        await createTableFromSource(target, targetSchema, table, columns, sourceSchema, targetSchema)
      }

      for (const sequence of sequences) {
        await setSequenceOwnership(target, sequence, targetSchema, table)
      }

      const targetRowCount = await countRows(target, targetSchema, table)
      if (targetRowCount > 0) {
        console.log(`Skipping ${targetSchema}.${table}: target already has ${targetRowCount} rows.`)
        continue
      }

      const insertColumns = columns.filter(column => column.generated === '').map(column => column.name)
      const primaryKeyColumns = await getPrimaryKeyColumns(source, sourceSchema, table)
      const primaryKeySet = new Set(primaryKeyColumns)
      const selectColumns = columns
        .filter(column => column.generated === '' || primaryKeySet.has(column.name))
        .map(column => column.name)
      const useOverride = columns.some(column => column.identity === 'a')

      console.log(`Copying ${sourceSchema}.${table} -> ${targetSchema}.${table}`)
      const copied = await copyTable(
        source,
        target,
        targetSchema,
        table,
        selectColumns,
        insertColumns,
        primaryKeyColumns,
        useOverride,
        batchSize,
      )
      console.log(`${targetSchema}.${table} rows copied: ${copied}`)

      const constraints = await getConstraints(source, sourceSchema, table)
      await applyConstraints(target, targetSchema, table, constraints, includeForeignKeys, sourceSchema, targetSchema)

      const constraintIndexNames = await getConstraintIndexNames(source, sourceSchema, table)
      const indexes = await getIndexes(source, sourceSchema, table)
      await applyIndexes(target, targetSchema, table, indexes, constraintIndexNames, sourceSchema, targetSchema)

      await resetSequences(target, targetSchema, table, insertColumns)
    }
  }
  finally {
    await source.end()
    await target.end()
  }
}

try {
  await run()
}
catch (error) {
  console.error(error)
  process.exitCode = 1
}
