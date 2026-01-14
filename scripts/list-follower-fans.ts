import Table from 'cli-table3'
import { Client } from 'pg'
import 'dotenv/config'

interface FollowerRow {
  mid: string | number | null
  name: string | null
  fans: string | number | null
}

interface CliOptions {
  mid: bigint
  limit: number
}

const DEFAULT_LIMIT = 50
const MIN_MID = 0n
const MAX_MID = 9_223_372_036_854_775_807n
const USAGE = 'Usage: pnpm tsx scripts/list-follower-fans.ts <mid> [--limit <n>]'

function parseMid(input: string | undefined, label: string): bigint {
  if (!input) {
    throw new Error(`Missing ${label}.`)
  }
  const trimmed = input.trim()
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`Invalid ${label}: ${input}`)
  }
  let value: bigint
  try {
    value = BigInt(trimmed)
  }
  catch {
    throw new Error(`Invalid ${label}: ${input}`)
  }
  if (value < MIN_MID || value > MAX_MID) {
    throw new Error(`Out of range ${label}: ${input}`)
  }
  return value
}

function parsePositiveInt(input: string | undefined, fallback: number, label: string): number {
  if (!input) {
    return fallback
  }
  const parsed = Number.parseInt(input, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: ${input}`)
  }
  return parsed
}

function parseArgs(args: string[]): CliOptions {
  if (args.length === 0) {
    throw new Error('Missing required arguments.')
  }
  const [midRaw, ...rest] = args
  let limit = DEFAULT_LIMIT

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]
    if (token === '--limit' || token === '-n') {
      const value = rest[index + 1]
      if (!value) {
        throw new Error('Missing value for limit.')
      }
      limit = parsePositiveInt(value, DEFAULT_LIMIT, 'limit')
      index += 1
      continue
    }
    if (token && token.startsWith('-')) {
      throw new Error(`Unknown option: ${token}`)
    }
    if (token) {
      throw new Error(`Unexpected argument: ${token}`)
    }
  }

  return {
    mid: parseMid(midRaw, 'mid'),
    limit,
  }
}

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

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    console.error('DATABASE_URL is not set.')
    return
  }

  const client = new Client({ connectionString })
  await client.connect()

  try {
    const result = await client.query<FollowerRow>(
      `select
         af.source::text as mid,
         i.name as name,
         lf.fans::bigint as fans
       from author_follows as af
       left join author_info_master as i on i.mid = af.source
       left join author_latest_fans as lf on lf.mid = af.source
       where af.target = $1
       order by lf.fans desc nulls last
       limit $2`,
      [options.mid.toString(), options.limit],
    )

    const rows = result.rows.map((row, index) => ({
      rank: index + 1,
      mid: toText(row.mid),
      name: row.name ?? '',
      fans: parseNumber(row.fans),
    }))

    if (rows.length === 0) {
      console.log('No followers found.')
      return
    }

    const table = new Table({
      head: ['Rank', 'MID', 'Fans', 'Name'],
      colAligns: ['right', 'right', 'right', 'left'],
      style: { head: [], border: [] },
    })

    for (const row of rows) {
      table.push([row.rank, row.mid, row.fans, row.name])
    }

    console.log(table.toString())
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
  console.error(USAGE)
  process.exitCode = 1
}
