import type { H3Event } from 'h3'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { getMethod, getRequestIP, getRequestPath } from 'h3'

interface RequestAuditEntry {
  count: number
  lastMethod: string
  lastPath: string
  lastSeenAt: number
}

interface RequestAuditSnapshotEntry {
  ip: string
  count: number
  lastSeenAt: string
  lastMethod: string
  lastPath: string
}

interface RequestAuditSnapshot {
  generatedAt: string
  startedAt: string
  totalRequests: number
  uniqueIpCount: number
  outputDir: string
  topIpLimit: number
  topIps: RequestAuditSnapshotEntry[]
}

const DEFAULT_FLUSH_INTERVAL_MS = 10_000
const DEFAULT_TOP_IP_LIMIT = 100
const IPV4_MAPPED_IPV6_PREFIX = '::ffff:'
const requestCounts = new Map<string, RequestAuditEntry>()
const startedAt = Date.now()
const outputDir = resolveAuditOutputDir()
const topIpLimit = parsePositiveInteger(
  process.env.AUDIT_TOP_IP_LIMIT,
  DEFAULT_TOP_IP_LIMIT,
)
const flushIntervalMs = parsePositiveInteger(
  process.env.AUDIT_FLUSH_INTERVAL_MS,
  DEFAULT_FLUSH_INTERVAL_MS,
)

let totalRequests = 0
let pendingFlush = false
let flushTimer: NodeJS.Timeout | null = null
let activeFlushPromise: Promise<void> | null = null

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

function resolveAuditOutputDir(): string {
  const configuredDir = process.env.AUDIT_OUTPUT_DIR?.trim()
  if (!configuredDir) {
    return path.resolve(process.cwd(), 'audit')
  }
  if (path.isAbsolute(configuredDir)) {
    return configuredDir
  }
  return path.resolve(process.cwd(), configuredDir)
}

function normalizeIp(ip: string | undefined): string {
  if (!ip) {
    return 'unknown'
  }

  let normalizedIp = ip.trim()
  if (!normalizedIp) {
    return 'unknown'
  }

  if (normalizedIp.startsWith(IPV4_MAPPED_IPV6_PREFIX)) {
    normalizedIp = normalizedIp.slice(IPV4_MAPPED_IPV6_PREFIX.length)
  }

  const bracketedIpv6Match = normalizedIp.match(/^\[([^[\]]+)\](?::\d+)?$/)
  if (bracketedIpv6Match) {
    normalizedIp = bracketedIpv6Match[1] ?? normalizedIp
  }

  const ipv4WithPortMatch = normalizedIp.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/)
  if (ipv4WithPortMatch) {
    normalizedIp = ipv4WithPortMatch[1] ?? normalizedIp
  }

  return normalizedIp.toLowerCase()
}

function markFlushPending(): void {
  pendingFlush = true

  if (flushTimer) {
    return
  }

  flushTimer = globalThis.setTimeout(() => {
    flushTimer = null
    void flushRequestAuditSnapshot()
  }, flushIntervalMs)
  flushTimer.unref?.()
}

function buildSnapshot(): RequestAuditSnapshot {
  const topIps = Array.from(requestCounts.entries())
    .sort((left, right) => {
      const countDifference = right[1].count - left[1].count
      if (countDifference !== 0) {
        return countDifference
      }

      const lastSeenDifference = right[1].lastSeenAt - left[1].lastSeenAt
      if (lastSeenDifference !== 0) {
        return lastSeenDifference
      }

      return left[0].localeCompare(right[0], 'en')
    })
    .slice(0, topIpLimit)
    .map(([ip, entry]) => ({
      ip,
      count: entry.count,
      lastSeenAt: new Date(entry.lastSeenAt).toISOString(),
      lastMethod: entry.lastMethod,
      lastPath: entry.lastPath,
    }))

  return {
    generatedAt: new Date().toISOString(),
    startedAt: new Date(startedAt).toISOString(),
    totalRequests,
    uniqueIpCount: requestCounts.size,
    outputDir,
    topIpLimit,
    topIps,
  }
}

function renderTextSnapshot(snapshot: RequestAuditSnapshot): string {
  const lines = [
    `generated_at: ${snapshot.generatedAt}`,
    `started_at: ${snapshot.startedAt}`,
    `total_requests: ${snapshot.totalRequests}`,
    `unique_ip_count: ${snapshot.uniqueIpCount}`,
    `top_ip_limit: ${snapshot.topIpLimit}`,
    '',
    'rank\tcount\tip\tlast_seen_at\tlast_method\tlast_path',
  ]

  snapshot.topIps.forEach((entry, index) => {
    lines.push([
      String(index + 1),
      String(entry.count),
      entry.ip,
      entry.lastSeenAt,
      entry.lastMethod,
      entry.lastPath,
    ].join('\t'))
  })

  return `${lines.join('\n')}\n`
}

async function writeAtomicFile(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tempPath, content, 'utf8')
  await rename(tempPath, filePath)
}

async function persistSnapshot(snapshot: RequestAuditSnapshot): Promise<void> {
  await mkdir(outputDir, { recursive: true })

  await Promise.all([
    writeAtomicFile(
      path.join(outputDir, 'top-ips.json'),
      `${JSON.stringify(snapshot, null, 2)}\n`,
    ),
    writeAtomicFile(
      path.join(outputDir, 'top-ips.txt'),
      renderTextSnapshot(snapshot),
    ),
  ])
}

export function recordRequestAudit(event: H3Event): void {
  const ip = normalizeIp(getRequestIP(event, { xForwardedFor: true }))
  const now = Date.now()
  const method = getMethod(event)
  const requestPath = getRequestPath(event)
  const currentEntry = requestCounts.get(ip)
  const nextEntry: RequestAuditEntry = currentEntry
    ? {
        ...currentEntry,
        count: currentEntry.count + 1,
        lastSeenAt: now,
        lastMethod: method,
        lastPath: requestPath,
      }
    : {
        count: 1,
        lastSeenAt: now,
        lastMethod: method,
        lastPath: requestPath,
      }

  requestCounts.set(ip, nextEntry)
  totalRequests += 1
  markFlushPending()
}

export async function flushRequestAuditSnapshot(force = false): Promise<void> {
  if (!force && !pendingFlush) {
    return
  }

  if (activeFlushPromise) {
    await activeFlushPromise
    return
  }

  if (flushTimer) {
    globalThis.clearTimeout(flushTimer)
    flushTimer = null
  }

  pendingFlush = false
  const snapshot = buildSnapshot()

  activeFlushPromise = (async () => {
    try {
      await persistSnapshot(snapshot)
    }
    catch (error) {
      console.error('Failed to write request audit snapshot.', error)
    }
    finally {
      activeFlushPromise = null
      if (pendingFlush) {
        void flushRequestAuditSnapshot()
      }
    }
  })()

  await activeFlushPromise
}

export function getRequestAuditOutputDir(): string {
  return outputDir
}
