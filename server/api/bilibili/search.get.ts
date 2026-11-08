import { sql } from 'drizzle-orm'
import { getQuery } from 'h3'
import { authorInfoMaster, authorLatestFans } from '~~/drizzle/schema'
import { db } from '~~/server/index'
import { parseNumberOrZero, parseUnsignedBigInt, toText } from '~~/server/utils/parsers'
import { getTableIdentifier } from '~~/server/utils/table'

interface AuthorSearchItem {
  mid: string
  name: string | null
  face: string | null
  fans: number
}

interface AuthorSearchResponse {
  items: AuthorSearchItem[]
}

interface AuthorSearchRow extends Record<string, unknown> {
  mid: string | number | null
  name: string | null
  face: string | null
  fans: string | number | null
}

const SEARCH_LIMIT = 20
// 与 drizzle/0008_author-search-mv.sql 里物化视图的筛选条件一致
const POPULAR_MIN_FANS = 1000
// 子串命中时按粉丝数取前 N 个候选再打分，避免短关键词命中几十万行时全部排序
const SUBSTRING_CANDIDATES = 200
const FUZZY_CANDIDATES = 50

function normalizeQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const [first] = value
    if (first === null || first === undefined) {
      return undefined
    }
    return typeof first === 'string' || typeof first === 'number' || typeof first === 'boolean'
      ? String(first)
      : undefined
  }
  if (value === null || value === undefined) {
    return undefined
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return undefined
}

function normalizeKeyword(value: unknown): string {
  const normalized = normalizeQueryValue(value)
  if (!normalized) {
    return ''
  }
  return normalized.trim().slice(0, 64)
}

function escapeLike(value: string): string {
  return value.replaceAll(/[\\%_]/g, String.raw`\$&`)
}

function toItem(row: AuthorSearchRow): AuthorSearchItem {
  return {
    mid: toText(row.mid),
    name: row.name,
    face: row.face,
    fans: parseNumberOrZero(row.fans),
  }
}

// 全表查询共用的列与关联：UP 主信息 + 最新粉丝数
function selectAuthors() {
  const infoTable = getTableIdentifier(authorInfoMaster)
  const fansTable = getTableIdentifier(authorLatestFans)
  return sql`
    select i.mid::text as mid, i.name, i.face, f.fans::bigint as fans
    from ${infoTable} as i
    left join ${fansTable} as f on f.mid = i.mid
  `
}

async function searchByMid(mid: bigint): Promise<AuthorSearchItem[]> {
  const result = await db.execute<AuthorSearchRow>(sql`${selectAuthors()} where i.mid = ${mid}`)
  return result.rows.map(toItem)
}

// author_search_mv：粉丝数 >= 1000 的 UP 主（mid, name, face, fans），每天刷新。
// name_grams(name) 是单字 + 二元组数组上的 GIN 索引，让 1~2 个字的关键词也能走索引做子串匹配。
// 打分 = 匹配度 × log(粉丝数)：完全同名 1.0；包含关键词 0.5 + 0.1 × 关键词占名字的比例；仅模糊相似 similarity × 0.4。
async function searchPopular(keyword: string): Promise<AuthorSearchItem[]> {
  const pattern = `%${escapeLike(keyword.toLowerCase())}%`
  const result = await db.execute<AuthorSearchRow>(sql`
    with substring_hits as (
      select mid, name, face, fans
      from author_search_mv
      where name_grams(name) @> name_grams(${keyword})
        and lower(name) like ${pattern}
      order by fans desc
      limit ${SUBSTRING_CANDIDATES}
    ),
    fuzzy_hits as (
      select mid, name, face, fans
      from author_search_mv
      where name % ${keyword}
      order by similarity(name, ${keyword}) desc
      limit ${FUZZY_CANDIDATES}
    ),
    candidates as (
      select * from substring_hits
      union
      select * from fuzzy_hits
    )
    select mid::text as mid, name, face, fans::bigint as fans
    from candidates
    order by
      (case
        when lower(name) = lower(${keyword}) then 1.0
        when lower(name) like ${pattern}
          then 0.5 + 0.1 * char_length(${keyword})::float8 / greatest(char_length(name), 1)
        else similarity(name, ${keyword}) * 0.4
      end) * log(fans + 10) desc,
      fans desc
    limit ${SEARCH_LIMIT}
  `)
  return result.rows.map(toItem)
}

// 兜底：在粉丝数 < 1000 的 UP 主里做三元组模糊匹配（>= 1000 的已由 author_search_mv 覆盖）。
// 较慢（需扫 100 个分区），只在热门结果不足时使用。
async function searchAll(keyword: string, limit: number): Promise<AuthorSearchItem[]> {
  const result = await db.execute<AuthorSearchRow>(sql`
    ${selectAuthors()}
    where i.name % ${keyword}
      and (f.fans is null or f.fans < ${POPULAR_MIN_FANS})
    order by
      (i.name = ${keyword}) desc,
      similarity(i.name, ${keyword}) desc,
      f.fans desc nulls last
    limit ${limit}
  `)
  return result.rows.map(toItem)
}

export default defineEventHandler(async (event): Promise<AuthorSearchResponse> => {
  const query = getQuery(event)
  const keyword = normalizeKeyword(query.q ?? query.keyword ?? query.k)
  if (!keyword) {
    return { items: [] }
  }

  // 纯数字先按 MID 精确查找；与昵称搜索并行，命中 MID 就直接返回
  const mid = /^\d+$/.test(keyword) ? parseUnsignedBigInt(keyword) : null
  const [byMid, items] = await Promise.all([
    mid === null ? [] : searchByMid(mid),
    searchPopular(keyword),
  ])
  if (byMid.length > 0) {
    return { items: byMid }
  }

  if (items.length < SEARCH_LIMIT) {
    const seen = new Set(items.map(item => item.mid))
    const extra = await searchAll(keyword, SEARCH_LIMIT - items.length)
    // 物化视图每天刷新，刚跨过 1000 粉的 UP 主可能两边都有，去一次重
    items.push(...extra.filter(item => !seen.has(item.mid)))
  }

  return { items }
})
