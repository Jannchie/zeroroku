import { Client } from 'pg'
import 'dotenv/config'

interface AdjacencyRow {
  source: string
  targets: string[]
}

interface ReverseAdjacencyRow {
  target: string
  sources: string[]
}

interface PathNode {
  id: string
  parent: PathNode | null
  depth: number
}

interface CliOptions {
  from: bigint
  to: bigint
  maxDepth: number
  limit: number
}

const DEFAULT_MAX_DEPTH = 4
const DEFAULT_LIMIT = 20
const MIN_MID = 0n
const MAX_MID = 9_223_372_036_854_775_807n
const USAGE = 'Usage: pnpm tsx scripts/find-follow-paths.ts <fromMid> <toMid> [--max-depth <n>] [--limit <n>]'

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
  if (args.length < 2) {
    throw new Error('Missing required arguments.')
  }

  const [
    fromRaw,
    toRaw,
    ...rest
  ] = args
  let maxDepth = DEFAULT_MAX_DEPTH
  let limit = DEFAULT_LIMIT

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]
    if (token === '--max-depth' || token === '-d') {
      const value = rest[index + 1]
      if (!value) {
        throw new Error('Missing value for max depth.')
      }
      maxDepth = parsePositiveInt(value, DEFAULT_MAX_DEPTH, 'max depth')
      index += 1
      continue
    }
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
    from: parseMid(fromRaw, 'fromMid'),
    to: parseMid(toRaw, 'toMid'),
    maxDepth,
    limit,
  }
}

async function loadAdjacency(
  client: Client,
  sources: string[],
  cache: Map<string, string[]>,
): Promise<Map<string, string[]>> {
  const adjacency = new Map<string, string[]>()
  const pending: string[] = []

  for (const source of sources) {
    const cached = cache.get(source)
    if (cached) {
      adjacency.set(source, cached)
      continue
    }
    pending.push(source)
  }

  if (pending.length === 0) {
    return adjacency
  }

  const result = await client.query<AdjacencyRow>(
    'select source::text as source, array_agg(target::text) as targets from author_follows where source = any($1::bigint[]) group by source',
    [pending],
  )

  for (const row of result.rows) {
    adjacency.set(row.source, row.targets ?? [])
  }

  for (const source of pending) {
    if (!adjacency.has(source)) {
      adjacency.set(source, [])
    }
    cache.set(source, adjacency.get(source) ?? [])
  }

  return adjacency
}

async function loadReverseAdjacency(
  client: Client,
  targets: string[],
  cache: Map<string, string[]>,
): Promise<Map<string, string[]>> {
  const adjacency = new Map<string, string[]>()
  const pending: string[] = []

  for (const target of targets) {
    const cached = cache.get(target)
    if (cached) {
      adjacency.set(target, cached)
      continue
    }
    pending.push(target)
  }

  if (pending.length === 0) {
    return adjacency
  }

  const result = await client.query<ReverseAdjacencyRow>(
    'select target::text as target, array_agg(source::text) as sources from author_follows where target = any($1::bigint[]) group by target',
    [pending],
  )

  for (const row of result.rows) {
    adjacency.set(row.target, row.sources ?? [])
  }

  for (const target of pending) {
    if (!adjacency.has(target)) {
      adjacency.set(target, [])
    }
    cache.set(target, adjacency.get(target) ?? [])
  }

  return adjacency
}

function pathHas(node: PathNode, id: string): boolean {
  let current: PathNode | null = node
  while (current) {
    if (current.id === id) {
      return true
    }
    current = current.parent
  }
  return false
}

function materializePath(node: PathNode): string[] {
  const path: string[] = []
  let current: PathNode | null = node
  while (current) {
    path.push(current.id)
    current = current.parent
  }
  return path.toReversed()
}

type NeighborLoader = (
  client: Client,
  nodes: string[],
  cache: Map<string, string[]>,
) => Promise<Map<string, string[]>>

async function buildPathIndex(
  client: Client,
  start: string,
  maxDepth: number,
  loadNeighbors: NeighborLoader,
  cache: Map<string, string[]>,
): Promise<Map<string, PathNode[]>> {
  const index = new Map<string, PathNode[]>()
  const startNode: PathNode = { id: start, parent: null, depth: 0 }
  index.set(start, [startNode])

  let frontier: PathNode[] = [startNode]

  for (let depth = 0; depth < maxDepth; depth += 1) {
    if (frontier.length === 0) {
      break
    }

    const sources = [...new Set(frontier.map(node => node.id))]
    const adjacency = await loadNeighbors(client, sources, cache)
    const nextFrontier: PathNode[] = []

    for (const node of frontier) {
      const neighbors = adjacency.get(node.id) ?? []
      for (const neighbor of neighbors) {
        if (pathHas(node, neighbor)) {
          continue
        }

        const nextNode: PathNode = { id: neighbor, parent: node, depth: node.depth + 1 }
        const list = index.get(neighbor)
        if (list) {
          list.push(nextNode)
        }
        else {
          index.set(neighbor, [nextNode])
        }

        if (nextNode.depth < maxDepth) {
          nextFrontier.push(nextNode)
        }
      }
    }

    frontier = nextFrontier
  }

  return index
}

function canJoinPaths(forward: PathNode, reverse: PathNode): boolean {
  let current = reverse.parent
  while (current) {
    if (pathHas(forward, current.id)) {
      return false
    }
    current = current.parent
  }
  return true
}

function combinePaths(forward: PathNode, reverse: PathNode): string[] {
  const forwardPath = materializePath(forward)
  const reversePath = materializePath(reverse).toReversed()
  return [...forwardPath, ...reversePath.slice(1)]
}

async function findPathsBidirectional(
  client: Client,
  start: string,
  target: string,
  maxDepth: number,
  limit: number,
): Promise<string[][]> {
  const forwardDepth = Math.floor(maxDepth / 2)
  const backwardDepth = maxDepth - forwardDepth
  const forwardCache = new Map<string, string[]>()
  const reverseCache = new Map<string, string[]>()

  const forwardIndex = await buildPathIndex(client, start, forwardDepth, loadAdjacency, forwardCache)
  const reverseIndex = await buildPathIndex(client, target, backwardDepth, loadReverseAdjacency, reverseCache)

  const meetingNodes = [...forwardIndex.keys()].filter(node => reverseIndex.has(node))
  const results: string[][] = []
  const seen = new Set<string>()

  for (let totalDepth = 1; totalDepth <= maxDepth; totalDepth += 1) {
    for (const meeting of meetingNodes) {
      const forwardPaths = forwardIndex.get(meeting)
      const reversePaths = reverseIndex.get(meeting)
      if (!forwardPaths || !reversePaths) {
        continue
      }

      for (const forwardPath of forwardPaths) {
        if (forwardPath.depth > totalDepth) {
          continue
        }
        for (const reversePath of reversePaths) {
          if (forwardPath.depth + reversePath.depth !== totalDepth) {
            continue
          }
          if (!canJoinPaths(forwardPath, reversePath)) {
            continue
          }

          const path = combinePaths(forwardPath, reversePath)
          const key = path.join(',')
          if (seen.has(key)) {
            continue
          }
          seen.add(key)
          results.push(path)
          if (results.length >= limit) {
            return results
          }
        }
      }
    }
  }

  return results
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
    const start = options.from.toString()
    const target = options.to.toString()
    const paths = await findPathsBidirectional(client, start, target, options.maxDepth, options.limit)

    if (paths.length === 0) {
      console.log('No paths found within the given depth.')
      return
    }

    console.log(`Found ${paths.length} path(s).`)
    for (const [index, path] of paths.entries()) {
      const depth = Math.max(path.length - 1, 0)
      console.log(`${index + 1}. depth=${depth} path=${path.join(' -> ')}`)
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
  console.error(error instanceof Error ? error.message : error)
  console.error(USAGE)
  process.exitCode = 1
}
