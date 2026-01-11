import { Client } from 'pg'
import 'dotenv/config'

const SOURCE_DATABASE = process.env.SOURCE_DATABASE ?? 'postgres'
const TARGET_DATABASE = process.env.TARGET_DATABASE
const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not set.')
}

const targetFromUrl = new URL(DATABASE_URL).pathname.replace(/^\//, '')
const targetDatabase = TARGET_DATABASE ?? targetFromUrl

if (!targetDatabase) {
  throw new Error('Target database name is missing.')
}

if (SOURCE_DATABASE === targetDatabase) {
  throw new Error('SOURCE_DATABASE and target database must be different.')
}

const BATCH_SIZE = 1000

const createTablesSql = [
  `create table if not exists public.check_ins (
    id bigserial primary key,
    updated_at timestamptz
  )`,
  `create table if not exists public.credit_records (
    id bigserial primary key,
    user_id bigint,
    credit numeric,
    text text,
    created_at timestamptz,
    data jsonb
  )`,
]

async function connect(dbName: string) {
  const url = new URL(DATABASE_URL)
  url.pathname = `/${dbName}`
  const client = new Client({ connectionString: url.toString() })
  await client.connect()
  return client
}

async function insertRows(
  client: Client,
  table: string,
  columns: string[],
  rows: Record<string, unknown>[],
) {
  if (rows.length === 0) {
    return
  }

  const values: unknown[] = []
  const placeholders = rows.map((row, rowIndex) => {
    const columnPlaceholders = columns.map((column, columnIndex) => {
      values.push(row[column])
      return `$${rowIndex * columns.length + columnIndex + 1}`
    })
    return `(${columnPlaceholders.join(', ')})`
  })

  const sql = `
    insert into public.${table} (${columns.join(', ')})
    values ${placeholders.join(', ')}
    on conflict (id) do nothing
  `
  await client.query(sql, values)
}

async function copyTable(
  source: Client,
  target: Client,
  table: string,
  columns: string[],
) {
  let lastId = 0
  let totalCopied = 0

  while (true) {
    const res = await source.query(
      `select ${columns.join(', ')} from public.${table} where id > $1 order by id limit $2`,
      [lastId, BATCH_SIZE],
    )

    if (res.rows.length === 0) {
      break
    }

    await insertRows(target, table, columns, res.rows)
    totalCopied += res.rows.length
    const lastRow = res.rows.at(-1)
    if (lastRow) {
      lastId = Number(lastRow.id)
    }
  }

  return totalCopied
}

async function resetSequence(client: Client, table: string) {
  await client.query(
    `select setval(pg_get_serial_sequence('public.${table}', 'id'), coalesce((select max(id) from public.${table}), 0))`,
  )
}

async function run() {
  const source = await connect(SOURCE_DATABASE)
  const target = await connect(targetDatabase)

  try {
    for (const statement of createTablesSql) {
      await target.query(statement)
    }

    const checkInsCopied = await copyTable(source, target, 'check_ins', ['id', 'updated_at'])
    const creditRecordsCopied = await copyTable(source, target, 'credit_records', [
      'id',
      'user_id',
      'credit',
      'text',
      'created_at',
      'data',
    ])

    await resetSequence(target, 'check_ins')
    await resetSequence(target, 'credit_records')

    console.log(`check_ins copied: ${checkInsCopied}`)
    console.log(`credit_records copied: ${creditRecordsCopied}`)
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
  throw error
}
