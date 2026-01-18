import { createHash } from 'node:crypto'
import { Client } from 'pg'
import 'dotenv/config'

interface Options {
  userId: string
  token: string
  baseUrl: string
  startPage: number
  maxPages: number | null
  perPage: number
  sleepMs: number
  timezoneOffset: number
  dryRun: boolean
  debug: boolean
  updateExisting: boolean
}

interface PageInfo {
  totalPages: number | null
  totalCount: number | null
}

interface FetchResult {
  orders: unknown[]
  pageInfo: PageInfo
}

interface SponsorRow {
  orderId: string
  userName: string
  sponsoredAt: string
  amount: string
}

interface DebugStats {
  missingOrderId: number
  missingUserName: number
  missingDate: number
  missingAmount: number
  sample: Record<string, unknown> | null
}

const DEFAULT_BASE_URL = 'https://afdian.com'
const DEFAULT_START_PAGE = 1
const DEFAULT_PER_PAGE = 50
const DEFAULT_SLEEP_MS = 0
const DEFAULT_TIMEZONE_OFFSET = 8
const PAID_STATUS = 2

function parseNumber(value: string, label: string, minValue = 1): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < minValue) {
    throw new Error(`${label} must be >= ${minValue}.`)
  }
  return parsed
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    userId: process.env.AFDIAN_USER_ID ?? '',
    token: process.env.AFDIAN_TOKEN ?? '',
    baseUrl: process.env.AFDIAN_BASE_URL ?? DEFAULT_BASE_URL,
    startPage: DEFAULT_START_PAGE,
    maxPages: null,
    perPage: DEFAULT_PER_PAGE,
    sleepMs: DEFAULT_SLEEP_MS,
    timezoneOffset: Number(process.env.AFDIAN_TIMEZONE_OFFSET ?? DEFAULT_TIMEZONE_OFFSET),
    dryRun: false,
    debug: false,
    updateExisting: false,
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
    if (arg === '--update-existing') {
      options.updateExisting = true
      continue
    }
    if (arg.startsWith('--user-id=')) {
      options.userId = arg.slice('--user-id='.length)
      continue
    }
    if (arg === '--user-id' || arg === '-u') {
      options.userId = args[i + 1] ?? ''
      i += 1
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
    if (arg.startsWith('--per-page=')) {
      options.perPage = parseNumber(arg.slice('--per-page='.length), 'per page')
      continue
    }
    if (arg === '--per-page') {
      options.perPage = parseNumber(args[i + 1] ?? '', 'per page')
      i += 1
      continue
    }
    if (arg.startsWith('--sleep-ms=')) {
      options.sleepMs = parseNumber(arg.slice('--sleep-ms='.length), 'sleep ms', 0)
      continue
    }
    if (arg === '--sleep-ms') {
      options.sleepMs = parseNumber(args[i + 1] ?? '', 'sleep ms', 0)
      i += 1
      continue
    }
    if (arg.startsWith('--timezone-offset=')) {
      options.timezoneOffset = Number(arg.slice('--timezone-offset='.length))
      continue
    }
    if (arg === '--timezone-offset') {
      options.timezoneOffset = Number(args[i + 1] ?? '')
      i += 1
      continue
    }
  }

  if (!options.userId) {
    throw new Error('User id is required. Use --user-id or set AFDIAN_USER_ID.')
  }
  if (!options.token) {
    throw new Error('Token is required. Use --token or set AFDIAN_TOKEN.')
  }
  if (options.perPage < 1 || options.perPage > 100) {
    throw new Error('per-page must be between 1 and 100.')
  }
  if (!Number.isFinite(options.timezoneOffset)) {
    throw new TypeError('timezone-offset must be a number.')
  }

  return options
}

function printUsage(): void {
  process.stdout.write('\nUsage:\n')
  process.stdout.write('  pnpm tsx scripts/import-afdian-sponsors.ts --user-id <id> --token <token>\n\n')
  process.stdout.write('Options:\n')
  process.stdout.write('  --user-id, -u        Afdian user id (or AFDIAN_USER_ID).\n')
  process.stdout.write('  --token, -t          API token (or AFDIAN_TOKEN).\n')
  process.stdout.write(`  --base-url           Base URL, default ${DEFAULT_BASE_URL}.\n`)
  process.stdout.write(`  --start-page         Start page, default ${DEFAULT_START_PAGE}.\n`)
  process.stdout.write('  --max-pages          Max pages to fetch.\n')
  process.stdout.write(`  --per-page           Page size (1-100), default ${DEFAULT_PER_PAGE}.\n`)
  process.stdout.write('  --sleep-ms           Sleep between pages.\n')
  process.stdout.write(`  --timezone-offset    Offset hours for date strings, default ${DEFAULT_TIMEZONE_OFFSET}.\n`)
  process.stdout.write('  --update-existing    Update existing rows on conflict.\n')
  process.stdout.write('  --dry-run            Fetch only, no insert.\n')
  process.stdout.write('  --debug              Print debug info for parsing.\n\n')
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

function parseText(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return null
}

function parseInteger(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : null
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!/^-?\d+$/.test(trimmed)) {
      return null
    }
    const parsed = Number.parseInt(trimmed, 10)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function normalizeAmountCents(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value * 100).toString()
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    const match = trimmed.match(/^(-)?(\d+)(?:\.(\d+))?$/)
    if (!match) {
      return null
    }
    const sign = match[1] ? -1 : 1
    const whole = Number(match[2])
    if (!Number.isFinite(whole)) {
      return null
    }
    const fractionSource = match[3] ?? ''
    const fraction = Number(fractionSource.slice(0, 2).padEnd(2, '0') || '0')
    if (!Number.isFinite(fraction)) {
      return null
    }
    return String(sign * (whole * 100 + fraction))
  }
  return null
}

function parseDate(value: unknown, timezoneOffset: number): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const millis = value > 10_000_000_000 ? value : value * 1000
    const parsed = new Date(millis)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    if (/^\d+$/.test(trimmed)) {
      const numeric = Number.parseInt(trimmed, 10)
      if (Number.isFinite(numeric)) {
        return parseDate(numeric, timezoneOffset)
      }
    }
    if (/z|[+-]\d{2}:?\d{2}$/i.test(trimmed)) {
      const direct = new Date(trimmed)
      return Number.isNaN(direct.getTime()) ? null : direct
    }
    const match = trimmed.match(
      /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/,
    )
    if (!match) {
      const direct = new Date(trimmed)
      return Number.isNaN(direct.getTime()) ? null : direct
    }
    const year = Number(match[1])
    const month = Number(match[2]) - 1
    const day = Number(match[3])
    const hour = Number(match[4] ?? 0)
    const minute = Number(match[5] ?? 0)
    const second = Number(match[6] ?? 0)
    const utcMillis = Date.UTC(year, month, day, hour - timezoneOffset, minute, second)
    const parsed = new Date(utcMillis)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

function resolveUserName(order: Record<string, unknown>): string | null {
  const userRecord = asRecord(order.user)
  const nestedName = userRecord
    ? parseText(userRecord.name)
      ?? parseText(userRecord.nickname)
      ?? parseText(userRecord.username)
    : null
  return nestedName
    ?? parseText(order.user_name)
    ?? parseText(order.user_id)
    ?? parseText(order.user_private_id)
    ?? null
}

function resolveSponsoredAt(order: Record<string, unknown>, timezoneOffset: number): string | null {
  const candidate = parseDate(order.created_at, timezoneOffset)
    ?? parseDate(order.create_time, timezoneOffset)
    ?? parseDate(order.created_time, timezoneOffset)
    ?? parseDate(order.pay_time, timezoneOffset)
    ?? parseDate(order.paid_at, timezoneOffset)
    ?? parseDate(order.create_date, timezoneOffset)
  return candidate ? candidate.toISOString() : null
}

function buildParams(params: Record<string, unknown>): string {
  const sortedEntries = Object.entries(params).toSorted(([a], [b]) => a.localeCompare(b))
  const normalized = Object.fromEntries(sortedEntries)
  return JSON.stringify(normalized)
}

function buildSign(userId: string, token: string, params: string, ts: number): string {
  const raw = `${token}params${params}ts${ts}user_id${userId}`
  return createHash('md5').update(raw).digest('hex')
}

async function fetchPage(page: number, options: Options): Promise<FetchResult> {
  const ts = Math.floor(Date.now() / 1000)
  const params = buildParams({ page, per_page: options.perPage })
  const sign = buildSign(options.userId, options.token, params, ts)
  const url = new URL('/api/open/query-order', options.baseUrl)

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify({
      user_id: options.userId,
      params,
      ts,
      sign,
    }),
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`)
  }

  const payload = await response.json() as Record<string, unknown>
  const ec = parseInteger(payload.ec)
  if (ec !== 200) {
    const em = parseText(payload.em) ?? 'Unknown error'
    throw new Error(`API error: ec=${ec ?? 'unknown'} em=${em}`)
  }

  const data = asRecord(payload.data)
  const list = data?.list
  const orders = Array.isArray(list) ? list : []
  const totalPages = parseInteger(data?.total_page) ?? parseInteger(data?.totalPages)
  const totalCount = parseInteger(data?.total_count) ?? parseInteger(data?.totalCount)

  return {
    orders,
    pageInfo: {
      totalPages: totalPages ?? null,
      totalCount: totalCount ?? null,
    },
  }
}

function normalizeOrders(
  items: unknown[],
  timezoneOffset: number,
  debug: boolean,
): { rows: SponsorRow[], ignored: number, skipped: number, debugStats: DebugStats | null } {
  const rows: SponsorRow[] = []
  let ignored = 0
  let skipped = 0
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
    const status = parseInteger(record.status)
    if (status !== PAID_STATUS) {
      skipped += 1
      continue
    }
    const orderId = parseText(record.out_trade_no)
    const userName = resolveUserName(record)
    const sponsoredAt = resolveSponsoredAt(record, timezoneOffset)
    const amount = normalizeAmountCents(record.show_amount) ?? normalizeAmountCents(record.total_amount)

    if (debugStats && !debugStats.sample) {
      debugStats.sample = {
        orderId,
        userName,
        sponsoredAt,
        amount,
        rawUserName: record.user_name,
        rawUserId: record.user_id,
        rawCreateTime: record.create_time ?? record.created_at,
        rawTotalAmount: record.total_amount,
      }
    }
    if (debugStats) {
      if (!orderId) {
        debugStats.missingOrderId += 1
      }
      if (!userName) {
        debugStats.missingUserName += 1
      }
      if (!sponsoredAt) {
        debugStats.missingDate += 1
      }
      if (!amount) {
        debugStats.missingAmount += 1
      }
    }

    if (!orderId || !userName || !sponsoredAt || !amount) {
      ignored += 1
      continue
    }

    if (seen.has(orderId)) {
      continue
    }
    seen.add(orderId)
    rows.push({ orderId, userName, sponsoredAt, amount })
  }

  return { rows, ignored, skipped, debugStats }
}

async function insertSponsors(
  client: Client,
  rows: SponsorRow[],
  dryRun: boolean,
  updateExisting: boolean,
): Promise<{ affected: number, skipped: number }> {
  if (rows.length === 0) {
    return { affected: 0, skipped: 0 }
  }

  if (dryRun) {
    return { affected: 0, skipped: rows.length }
  }

  const orderIds = rows.map(row => row.orderId)
  const userNames = rows.map(row => row.userName)
  const sponsoredAts = rows.map(row => row.sponsoredAt)
  const amounts = rows.map(row => row.amount)

  const conflictSql = updateExisting
    ? `on conflict (order_id) do update set
        user_name = excluded.user_name,
        sponsored_at = excluded.sponsored_at,
        amount = excluded.amount`
    : 'on conflict (order_id) do nothing'

  const sql = `
    insert into public.sponsors (order_id, user_name, sponsored_at, amount)
    select
      t.order_id,
      t.user_name,
      t.sponsored_at,
      t.amount
    from unnest($1::text[], $2::text[], $3::timestamptz[], $4::numeric[]) as t(order_id, user_name, sponsored_at, amount)
    ${conflictSql}
  `

  const result = await client.query(sql, [orderIds, userNames, sponsoredAts, amounts])
  const affected = result.rowCount ?? 0
  const skipped = rows.length - affected
  return { affected, skipped }
}

function hasNextPage(page: number, pageInfo: PageInfo, items: unknown[], perPage: number): boolean {
  if (pageInfo.totalPages) {
    return page < pageInfo.totalPages
  }
  if (perPage > 0) {
    return items.length >= perPage
  }
  return items.length > 0
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
  let totalUnpaid = 0

  try {
    while (true) {
      if (options.maxPages && pagesFetched >= options.maxPages) {
        break
      }

      const { orders, pageInfo } = await fetchPage(page, options)
      const { rows, ignored, skipped, debugStats } = normalizeOrders(orders, options.timezoneOffset, options.debug)
      const { affected, skipped: insertSkipped } = await insertSponsors(client, rows, options.dryRun, options.updateExisting)

      totalInserted += affected
      totalSkipped += insertSkipped
      totalIgnored += ignored
      totalUnpaid += skipped

      const displayPage = page
      const label = options.updateExisting ? 'upserted' : 'inserted'
      console.log(`page ${displayPage}: fetched ${orders.length}, ${label} ${affected}, skipped ${insertSkipped}, ignored ${ignored}, unpaid ${skipped}`)
      if (options.debug && debugStats) {
        console.log(`page ${displayPage} debug: missing order_id=${debugStats.missingOrderId}, user_name=${debugStats.missingUserName}, sponsored_at=${debugStats.missingDate}, amount=${debugStats.missingAmount}`)
        if (debugStats.sample) {
          console.log(`page ${displayPage} sample: ${JSON.stringify(debugStats.sample)}`)
        }
      }

      pagesFetched += 1

      if (orders.length === 0) {
        break
      }
      if (!hasNextPage(page, pageInfo, orders, options.perPage)) {
        break
      }

      page += 1
      await sleep(options.sleepMs)
    }
  }
  finally {
    await client.end()
  }

  const totalLabel = options.updateExisting ? 'upserted' : 'inserted'
  console.log(`done: ${totalLabel} ${totalInserted}, skipped ${totalSkipped}, ignored ${totalIgnored}, unpaid ${totalUnpaid}`)
}

try {
  await run()
}
catch (error) {
  console.error(error)
  process.exitCode = 1
}
