import { Client } from 'pg'
import 'dotenv/config'

interface Options {
  token: string
  baseUrl: string
  startPage: number
  maxPages: number | null
  timezone: string
  dryRun: boolean
  sleepMs: number
  debug: boolean
}

interface PageInfo {
  page: number | null
  pageSize: number | null
  total: number | null
  totalPages: number | null
}

interface FetchResult {
  orders: unknown[]
  pageInfo: PageInfo
}

interface SponsorRow {
  orderId: string
  userName: string
  createDate: string
  amount: string
}

const DEFAULT_BASE_URL = 'https://azz.net'
const DEFAULT_TIMEZONE = 'Asia/Shanghai'
const DEFAULT_START_PAGE = 1
const DEFAULT_SLEEP_MS = 0
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function parseNumber(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`)
  }
  return parsed
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    token: process.env.AZZ_TOKEN ?? '',
    baseUrl: DEFAULT_BASE_URL,
    startPage: DEFAULT_START_PAGE,
    maxPages: null,
    timezone: process.env.AZZ_TIMEZONE ?? DEFAULT_TIMEZONE,
    dryRun: false,
    sleepMs: DEFAULT_SLEEP_MS,
    debug: false,
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (!arg) {
      continue
    }
    if (arg === '--help' || arg === '-h') {
      printUsage()
      throw new Error('Invalid arguments')
    }
    if (arg === '--dry-run') {
      options.dryRun = true
      continue
    }
    if (arg === '--debug') {
      options.debug = true
      continue
    }
    if (arg.startsWith('--token=')) {
      options.token = arg.slice('--token='.length)
      continue
    }
    if (arg === '--token' || arg === '-t') {
      options.token = args[i + 1] ?? ''
      i += 1
      continue
    }
    if (arg.startsWith('--base-url=')) {
      options.baseUrl = arg.slice('--base-url='.length)
      continue
    }
    if (arg === '--base-url') {
      options.baseUrl = args[i + 1] ?? DEFAULT_BASE_URL
      i += 1
      continue
    }
    if (arg.startsWith('--start-page=')) {
      options.startPage = parseNumber(arg.slice('--start-page='.length), 'start page')
      continue
    }
    if (arg === '--start-page') {
      options.startPage = parseNumber(args[i + 1] ?? '', 'start page')
      i += 1
      continue
    }
    if (arg.startsWith('--max-pages=')) {
      options.maxPages = parseNumber(arg.slice('--max-pages='.length), 'max pages')
      continue
    }
    if (arg === '--max-pages') {
      options.maxPages = parseNumber(args[i + 1] ?? '', 'max pages')
      i += 1
      continue
    }
    if (arg.startsWith('--timezone=')) {
      options.timezone = arg.slice('--timezone='.length)
      continue
    }
    if (arg === '--timezone') {
      options.timezone = args[i + 1] ?? DEFAULT_TIMEZONE
      i += 1
      continue
    }
    if (arg.startsWith('--sleep-ms=')) {
      options.sleepMs = parseNumber(arg.slice('--sleep-ms='.length), 'sleep ms')
      continue
    }
    if (arg === '--sleep-ms') {
      options.sleepMs = parseNumber(args[i + 1] ?? '', 'sleep ms')
      i += 1
      continue
    }
  }

  if (!options.token) {
    throw new Error('Token is required. Use --token or set AZZ_TOKEN.')
  }

  return options
}

function printUsage(): void {
  process.stdout.write(`\nUsage:\n`)
  process.stdout.write(`  pnpm tsx scripts/import-azz-sponsors.ts --token <token>\n\n`)
  process.stdout.write(`Options:\n`)
  process.stdout.write(`  --token, -t        Token cookie value (or AZZ_TOKEN env).\n`)
  process.stdout.write(`  --base-url         Base URL, default ${DEFAULT_BASE_URL}.\n`)
  process.stdout.write(`  --start-page       Start page, default ${DEFAULT_START_PAGE}.\n`)
  process.stdout.write(`  --max-pages        Max pages to fetch.\n`)
  process.stdout.write(`  --timezone         Timezone for create_date, default ${DEFAULT_TIMEZONE}.\n`)
  process.stdout.write(`  --sleep-ms         Sleep between pages.\n`)
  process.stdout.write(`  --dry-run          Fetch only, no insert.\n\n`)
  process.stdout.write(`  --debug            Print debug info for parsing.\n\n`)
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve()
  }
  return new Promise(resolve => setTimeout(resolve, ms))
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function _readList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function extractOrders(payload: unknown): unknown[] {
  const root = asRecord(payload)
  if (!root) {
    return []
  }
  const data = asRecord(root.data) ?? root
  const candidates = [
    data.list,
    data.rows,
    data.items,
    data.data,
    root.list,
    root.rows,
    root.items,
  ]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
    }
  }
  return []
}

function extractPageInfo(payload: unknown): PageInfo {
  const root = asRecord(payload)
  const data = asRecord(root?.data) ?? root
  const page = readNumber(data?.page) ?? readNumber(data?.current_page) ?? readNumber(data?.page_index)
  const pageSize = readNumber(data?.page_size) ?? readNumber(data?.pageSize) ?? readNumber(data?.size) ?? readNumber(data?.limit)
  const total = readNumber(data?.total) ?? readNumber(data?.total_count) ?? readNumber(data?.count)
  const totalPages = readNumber(data?.total_page) ?? readNumber(data?.total_pages) ?? readNumber(data?.page_count) ?? readNumber(data?.pages)
  return {
    page: page ?? null,
    pageSize: pageSize ?? null,
    total: total ?? null,
    totalPages: totalPages ?? null,
  }
}

function hasNextPage(pageInfo: PageInfo, items: unknown[]): boolean {
  if (pageInfo.totalPages && pageInfo.page) {
    return pageInfo.page < pageInfo.totalPages
  }
  if (pageInfo.total && pageInfo.page && pageInfo.pageSize) {
    return pageInfo.page * pageInfo.pageSize < pageInfo.total
  }
  return items.length > 0
}

function normalizeAmount(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString()
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    const parsed = Number(trimmed)
    if (Number.isFinite(parsed)) {
      return trimmed
    }
  }
  return null
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = readString(record[key])
    if (value) {
      return value
    }
  }
  return null
}

function pickAmount(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = normalizeAmount(record[key])
    if (value) {
      return value
    }
  }
  return null
}

interface DebugStats {
  missingOrderId: number
  missingUserName: number
  missingDate: number
  missingAmount: number
  sample: Record<string, unknown> | null
}

function normalizeOrders(items: unknown[], debug: boolean): { rows: SponsorRow[], ignored: number, debugStats: DebugStats | null } {
  const rows: SponsorRow[] = []
  let ignored = 0
  const seen = new Set<string>()
  const debugStats: DebugStats | null = debug
    ? {
        missingOrderId: 0,
        missingUserName: 0,
        missingDate: 0,
        missingAmount: 0,
        sample: null,
      }
    : null

  for (const item of items) {
    const record = asRecord(item)
    if (!record) {
      ignored += 1
      continue
    }
    const userRecord = asRecord(record.user)
    const nestedUserName = userRecord ? pickString(userRecord, ['name', 'nickname', 'username']) : null
    const orderId = pickString(record, ['order_id', 'orderId'])
    const userName = nestedUserName ?? pickString(record, ['user_name', 'userName', 'nickname', 'nick_name', 'name', 'sponsor_name', 'sponsorName'])
    const createDate = normalizeDate(record.create_date ?? record.created_at ?? record.createdAt ?? record.createAt)
    const amount = pickAmount(record, ['order_price', 'orderPrice', 'price', 'amount', 'money'])
    if (debugStats && !debugStats.sample) {
      debugStats.sample = {
        orderId,
        userName,
        createDate,
        amount,
        rawUserName: record.user_name,
        rawSponsorName: record.sponsor_name,
        rawCreateDate: record.create_date,
        rawOrderPrice: record.order_price,
        hasUser: Boolean(userRecord),
        rawUserNameFromUser: nestedUserName,
      }
    }
    if (debugStats) {
      if (!orderId) {
        debugStats.missingOrderId += 1
      }
      if (!userName) {
        debugStats.missingUserName += 1
      }
      if (!createDate) {
        debugStats.missingDate += 1
      }
      if (!amount) {
        debugStats.missingAmount += 1
      }
    }
    if (!orderId || !userName || !createDate || !amount) {
      ignored += 1
      continue
    }
    const dedupeKey = orderId
    if (seen.has(dedupeKey)) {
      continue
    }
    seen.add(dedupeKey)
    rows.push({ orderId, userName, createDate, amount })
  }

  return { rows, ignored, debugStats }
}

async function fetchPage(page: number, options: Options): Promise<FetchResult> {
  const url = new URL('/api/v3/order/list/receive', options.baseUrl)
  url.searchParams.set('page', page.toString())
  const refererBase = options.baseUrl.endsWith('/') ? options.baseUrl.slice(0, -1) : options.baseUrl

  const response = await fetch(url.toString(), {
    headers: {
      'accept': 'application/json, text/plain, */*',
      'cookie': `token=${options.token}`,
      'referer': `${refererBase}/my/orders/receive`,
      'user-agent': DEFAULT_USER_AGENT,
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`)
  }

  const payload = await response.json() as unknown
  const orders = extractOrders(payload)
  const pageInfo = extractPageInfo(payload)
  return { orders, pageInfo }
}

async function insertSponsors(
  client: Client,
  rows: SponsorRow[],
  timezone: string,
  dryRun: boolean,
): Promise<{ inserted: number, skipped: number }> {
  if (rows.length === 0) {
    return { inserted: 0, skipped: 0 }
  }

  if (dryRun) {
    return { inserted: 0, skipped: rows.length }
  }

  const userNames = rows.map(row => row.userName)
  const createDates = rows.map(row => row.createDate)
  const amounts = rows.map(row => row.amount)
  const orderIds = rows.map(row => row.orderId)

  const sql = `
    insert into public.sponsors (order_id, user_name, sponsored_at, amount)
    select
      t.order_id,
      t.user_name,
      (t.create_date::timestamp at time zone $5) as sponsored_at,
      t.amount
    from unnest($1::text[], $2::text[], $3::text[], $4::numeric[]) as t(order_id, user_name, create_date, amount)
    on conflict (order_id) do nothing
  `

  const result = await client.query(sql, [orderIds, userNames, createDates, amounts, timezone])
  const inserted = result.rowCount ?? 0
  const skipped = rows.length - inserted
  return { inserted, skipped }
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is missing.')
  }

  const client = new Client({ connectionString })
  await client.connect()

  let page = options.startPage
  let pagesFetched = 0
  let totalInserted = 0
  let totalSkipped = 0
  let totalIgnored = 0

  try {
    while (true) {
      if (options.maxPages && pagesFetched >= options.maxPages) {
        break
      }
      const { orders, pageInfo } = await fetchPage(page, options)
      const { rows, ignored, debugStats } = normalizeOrders(orders, options.debug)
      const { inserted, skipped } = await insertSponsors(client, rows, options.timezone, options.dryRun)

      totalInserted += inserted
      totalSkipped += skipped
      totalIgnored += ignored

      const displayPage = pageInfo.page ?? page
      console.log(`page ${displayPage}: fetched ${orders.length}, inserted ${inserted}, skipped ${skipped}, ignored ${ignored}`)
      if (options.debug && debugStats) {
        console.log(`page ${displayPage} debug: missing order_id=${debugStats.missingOrderId}, user_name=${debugStats.missingUserName}, create_date=${debugStats.missingDate}, amount=${debugStats.missingAmount}`)
        if (debugStats.sample) {
          console.log(`page ${displayPage} sample: ${JSON.stringify(debugStats.sample)}`)
        }
      }

      pagesFetched += 1

      if (orders.length === 0) {
        break
      }
      if (!hasNextPage(pageInfo, orders)) {
        break
      }

      page += 1
      await sleep(options.sleepMs)
    }
  }
  finally {
    await client.end()
  }

  console.log(`done: inserted ${totalInserted}, skipped ${totalSkipped}, ignored ${totalIgnored}`)
}

try {
  await run()
}
catch (error) {
  console.error(error)
  process.exitCode = 1
}
