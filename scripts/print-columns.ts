import { Client } from 'pg'
import 'dotenv/config'

interface ColumnRow {
  column_name: string
  data_type: string
  udt_name: string
  is_nullable: 'YES' | 'NO'
  ordinal_position: number
}

interface TableTarget {
  schema: string
  table: string
}

const DEFAULT_SCHEMA = 'public'
const DEFAULT_TABLES = [
  `${DEFAULT_SCHEMA}.author_info_master`,
  `${DEFAULT_SCHEMA}.video_info_master`,
]

function parseTargets(args: string[]): TableTarget[] {
  const inputs = args.length > 0 ? args : DEFAULT_TABLES
  return inputs.map((input) => {
    const trimmed = input.trim()
    if (!trimmed) {
      return { schema: DEFAULT_SCHEMA, table: '' }
    }
    const parts = trimmed.split('.')
    if (parts.length === 1) {
      return { schema: DEFAULT_SCHEMA, table: parts[0] }
    }
    return { schema: parts[0], table: parts.slice(1).join('.') }
  }).filter(target => Boolean(target.table))
}

function formatColumn(row: ColumnRow): string {
  const nullable = row.is_nullable === 'YES' ? 'nullable' : 'not null'
  return `  - ${row.column_name} ${row.data_type} (${row.udt_name}) ${nullable}`
}

async function main(): Promise<void> {
  const targets = parseTargets(process.argv.slice(2))
  if (targets.length === 0) {
    console.error('No table targets provided.')
    return
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL is not set.')
    return
  }

  const client = new Client({ connectionString })
  await client.connect()

  try {
    for (const target of targets) {
      const result = await client.query<ColumnRow>(
        `select column_name, data_type, udt_name, is_nullable, ordinal_position
         from information_schema.columns
         where table_schema = $1 and table_name = $2
         order by ordinal_position;`,
        [target.schema, target.table],
      )

      const header = `Table: ${target.schema}.${target.table}\n`
      const lines = result.rows.length > 0
        ? result.rows.map(row => formatColumn(row)).join('\n')
        : '  (no columns)'
      process.stdout.write(`${header}${lines}\n\n`)
    }
  }
  finally {
    await client.end()
  }
}

try {
  await main()
}
catch (error) {
  console.error(error)
  process.exitCode = 1
}
