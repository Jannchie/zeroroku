<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { authClient } from '~~/lib/client'
import { formatDateTime } from '~~/lib/formatDateTime'

interface AuthorDetailItem {
  mid: string
  name: string | null
  face: string | null
  sign: string | null
  sex: string | null
  level: number | null
  topPhoto: string | null
  fans: number | null
  rate7: number | null
  rate1: number | null
}

interface AuthorDetailResponse {
  item: AuthorDetailItem | null
}

interface AuthorHistoryItem {
  id: string
  mid: string
  fans: number | null
  createdAt: string | null
  rate1: number | null
  rate7: number | null
}

interface AuthorHistoryResponse {
  items: AuthorHistoryItem[]
}

interface LivePaidEventAggregationResponse {
  roomId: string | null
  columns: string[]
  items: Record<string, string | number | null>[]
}

interface ObserveResponse {
  ok: boolean
  cost: number
  credit: number
}

interface RecentAuthorItem {
  mid: string
  name: string | null
  face: string | null
}

const route = useRoute()
const midParam = computed(() => (Array.isArray(route.params.mid) ? route.params.mid[0] : route.params.mid))
const mid = computed(() => (typeof midParam.value === 'string' ? midParam.value : ''))
const session = authClient.useSession()
const user = computed(() => session.value?.data?.user ?? null)

const { data, pending, error } = useFetch<AuthorDetailResponse>(
  () => `/api/bilibili/author/${encodeURIComponent(mid.value)}`,
  {
    watch: [mid],
  },
)

const { data: historyData, pending: historyPending, error: historyError } = useFetch<AuthorHistoryResponse>(
  () => `/api/bilibili/author/${encodeURIComponent(mid.value)}/history`,
  {
    watch: [mid],
  },
)

const { data: aggregationData, pending: aggregationPending, error: aggregationError } = useFetch<LivePaidEventAggregationResponse>(
  () => `/api/bilibili/author/${encodeURIComponent(mid.value)}/live-paid-aggregations`,
  {
    watch: [mid],
  },
)

const author = computed(() => data.value?.item ?? null)
const pageTitle = computed(() => {
  const name = author.value?.name?.trim()
  if (name) {
    return `${name} 粉丝趋势与数据 · Bilibili`
  }
  if (mid.value) {
    return `UP ${mid.value} 粉丝趋势与数据 · Bilibili`
  }
  return 'Bilibili UP 主数据'
})

const historyItems = computed(() => historyData.value?.items ?? [])
const hiddenAggregationColumnKeys = new Set(['id', 'roomid', 'updateat', 'updatedat', 'updatetime', 'updatedtime'])
const aggregationColumns = computed(() => {
  const columns = aggregationData.value?.columns ?? []
  return columns.filter((column) => {
    const normalized = normalizeAggregationColumnKey(column)
    if (normalized === 'bucketstart') {
      return true
    }
    if (hiddenAggregationColumnKeys.has(normalized)) {
      return false
    }
    if (normalized.includes('bucket')) {
      return false
    }
    if (normalized.includes('time') || normalized.includes('date')) {
      return false
    }
    return true
  })
})
const aggregationItems = computed(() => aggregationData.value?.items ?? [])
const aggregationRoomId = computed(() => aggregationData.value?.roomId ?? null)
const formatter = new Intl.NumberFormat('zh-CN')
const amountFormatter = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 })
const deltaFormatter = new Intl.NumberFormat('zh-CN', { signDisplay: 'exceptZero' })
const observeCost = 10
const observePending = ref(false)
const observeError = ref<string | null>(null)
const observeSuccess = ref<string | null>(null)

const pageSize = 10
const currentPage = ref(1)
const totalHistory = computed(() => historyItems.value.length)
const totalPages = computed(() => Math.ceil(totalHistory.value / pageSize))
const canDownloadHistory = computed(() => historyItems.value.length > 0 && !historyPending.value && !historyError.value)
const pagedHistory = computed(() => {
  if (historyItems.value.length === 0) {
    return []
  }
  const start = (currentPage.value - 1) * pageSize
  return historyItems.value.slice(start, start + pageSize)
})
const historyTableHeaderRef = ref<HTMLDivElement | null>(null)
const canObserve = computed(() => Boolean(mid.value && author.value) && !observePending.value)
const aggregationSkeletonRows = Array.from({ length: 10 }, (_, index) => index)
const aggregationTableHeaderRef = ref<HTMLDivElement | null>(null)

const aggregationPageSize = 10
const aggregationCurrentPage = ref(1)
const aggregationTotal = computed(() => aggregationItems.value.length)
const aggregationTotalPages = computed(() => Math.ceil(aggregationTotal.value / aggregationPageSize))
const aggregationPagedItems = computed(() => {
  if (aggregationItems.value.length === 0) {
    return []
  }
  const start = (aggregationCurrentPage.value - 1) * aggregationPageSize
  return aggregationItems.value.slice(start, start + aggregationPageSize)
})

const columnLabelMap: Record<string, string> = {
  bucketstart: '时间',
  timestamp: '时间',
  createdat: '时间',
  giftid: '礼物ID',
  giftname: '礼物',
  giftamount: '礼物金额',
  giftcount: '礼物数量',
  giftnum: '礼物数量',
  gifts: '礼物数量',
  guardamount: '大航海金额',
  scamount: 'SC金额',
  price: '单价',
  count: '数量',
  amount: '金额',
  totalamount: '总金额',
  totalprice: '总金额',
  totalvalue: '总金额',
  total: '总计',
  value: '金额',
  roomid: '直播间',
  uid: '用户ID',
  mid: 'UP主ID',
  name: '名称',
}

function normalizeAggregationColumnKey(value: string): string {
  return value.replaceAll(/[^a-z0-9]/gi, '').toLowerCase()
}

watch(historyItems, () => {
  currentPage.value = 1
})

watch(aggregationItems, () => {
  aggregationCurrentPage.value = 1
})

watch(mid, () => {
  observeError.value = null
  observeSuccess.value = null
})

watch(totalPages, (value) => {
  if (value <= 0) {
    currentPage.value = 1
    return
  }
  if (currentPage.value > value) {
    currentPage.value = value
  }
})

watch(aggregationTotalPages, (value) => {
  if (value <= 0) {
    aggregationCurrentPage.value = 1
    return
  }
  if (aggregationCurrentPage.value > value) {
    aggregationCurrentPage.value = value
  }
})

function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '--'
  }
  return formatter.format(Number.isFinite(value) ? value : 0)
}

function formatDelta(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--'
  }
  return deltaFormatter.format(Math.round(value))
}

function normalizeColumnLabel(key: string): string {
  const normalized = normalizeAggregationColumnKey(key)
  return columnLabelMap[normalized] ?? `字段 ${key}`
}

function isNumericColumn(key: string, value: string | number | null): boolean {
  if (value === null) {
    return false
  }
  const numericKeys = new Set(['price', 'count', 'amount', 'gifts', 'total', 'value'])
  if (numericKeys.has(key)) {
    return true
  }
  if (typeof value === 'number') {
    return Number.isFinite(value)
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) && /^[+-]?\d+(?:\.\d+)?$/.test(value.trim())
  }
  return false
}

function parseAggregationNumber(value: string | number): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  const parsed = Number.parseFloat(trimmed)
  return Number.isFinite(parsed) && /^[+-]?\d+(?:\.\d+)?$/.test(trimmed) ? parsed : null
}

function pickAggregationAmountColumn(columns: string[]): string | null {
  if (columns.length === 0) {
    return null
  }
  const normalizedMap = new Map<string, string>()
  for (const column of columns) {
    normalizedMap.set(normalizeAggregationColumnKey(column), column)
  }
  const preferredKeys = ['totalamount', 'totalprice', 'totalvalue', 'amount', 'total', 'value']
  for (const key of preferredKeys) {
    const match = normalizedMap.get(key)
    if (match) {
      return match
    }
  }
  for (const column of columns) {
    const normalized = normalizeAggregationColumnKey(column)
    if (normalized.includes('amount') || normalized.includes('total') || normalized.includes('value')) {
      return column
    }
  }
  return null
}

function isTimeColumn(key: string): boolean {
  const normalized = normalizeAggregationColumnKey(key)
  if (normalized === 'bucketstart') {
    return true
  }
  if (normalized === 'timestamp' || normalized === 'createdat' || normalized === 'createdtime') {
    return true
  }
  if (normalized === 'updatedat' || normalized === 'updatetime' || normalized === 'time' || normalized === 'date') {
    return true
  }
  return /time|date/.test(normalized)
}

const aggregationTimeColumn = computed(() => {
  return aggregationColumns.value.find(column => normalizeAggregationColumnKey(column) === 'bucketstart') ?? null
})

const aggregationAmountColumn = computed(() => {
  return pickAggregationAmountColumn(aggregationColumns.value)
})

const aggregationTotals = computed(() => {
  const amountColumn = aggregationAmountColumn.value
  const timeColumn = aggregationTimeColumn.value
  if (!amountColumn || !timeColumn) {
    return null
  }
  let latestTs = -Infinity
  const parsedRows: Array<{ ts: number, amount: number }> = []
  for (const row of aggregationItems.value) {
    const timeValue = row[timeColumn]
    const amountValue = row[amountColumn]
    if (timeValue === null || timeValue === undefined || amountValue === null || amountValue === undefined) {
      continue
    }
    if (typeof timeValue !== 'string' && typeof timeValue !== 'number') {
      continue
    }
    if (typeof amountValue !== 'string' && typeof amountValue !== 'number') {
      continue
    }
    const parsedTime = parseAggregationTime(timeValue)
    const parsedAmount = parseAggregationNumber(amountValue)
    if (!parsedTime || parsedAmount === null) {
      continue
    }
    const dayStart = new Date(parsedTime)
    dayStart.setHours(0, 0, 0, 0)
    const ts = dayStart.getTime()
    if (!Number.isFinite(ts)) {
      continue
    }
    latestTs = Math.max(latestTs, ts)
    parsedRows.push({ ts, amount: parsedAmount })
  }
  if (!Number.isFinite(latestTs) || parsedRows.length === 0) {
    return null
  }
  const oneDay = 24 * 60 * 60 * 1000
  const sumWithinDays = (days: number) => {
    const threshold = latestTs - (days - 1) * oneDay
    let sum = 0
    for (const row of parsedRows) {
      if (row.ts >= threshold) {
        sum += row.amount
      }
    }
    return sum
  }
  return {
    day: sumWithinDays(1),
    week: sumWithinDays(7),
    month: sumWithinDays(30),
  }
})

function parseAggregationTime(value: string | number): Date | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null
    }
    const millis = value > 10_000_000_000 ? value : value * 1000
    const date = new Date(millis)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  if (/^\d+$/.test(trimmed)) {
    const numeric = Number.parseInt(trimmed, 10)
    if (Number.isFinite(numeric)) {
      return parseAggregationTime(numeric)
    }
  }
  const direct = new Date(trimmed)
  if (!Number.isNaN(direct.getTime())) {
    return direct
  }
  const match = trimmed.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/,
  )
  if (!match) {
    return null
  }
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const hour = Number(match[4] ?? 0)
  const minute = Number(match[5] ?? 0)
  const second = Number(match[6] ?? 0)
  const date = new Date(year, month, day, hour, minute, second)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatAggregationValue(key: string, value: string | number | null): string {
  if (value === null || value === undefined) {
    return '--'
  }
  if (isTimeColumn(key) && (typeof value === 'string' || typeof value === 'number')) {
    const parsed = parseAggregationTime(value)
    if (parsed) {
      return formatDateTime(parsed, { fallback: '--', useRawOnInvalid: false })
    }
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed) && /^[+-]?\d+(?:\.\d+)?$/.test(value.trim())) {
      return formatter.format(parsed)
    }
    return value
  }
  if (typeof value === 'number') {
    return formatter.format(value)
  }
  return String(value)
}

function formatAmountValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--'
  }
  return amountFormatter.format(value)
}

function liveRoomLink(roomId: string): string {
  return `https://live.bilibili.com/${roomId}`
}

function formatTimestamp(value: string | null | undefined): string {
  return formatDateTime(value, { fallback: '--' })
}

const seoDescriptionMaxLength = 120

function normalizeSeoText(value: string): string {
  return value.replaceAll(/\s+/g, ' ').trim()
}

function trimSeoText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`
}

const pageDescription = computed(() => {
  const name = author.value?.name?.trim()
  const midLabel = mid.value ? `UP ${mid.value}` : 'UP 主'
  const titlePart = name ? `${name}（${midLabel}）` : midLabel
  const stats: string[] = []
  const fans = author.value?.fans
  const rate7 = author.value?.rate7
  const rate1 = author.value?.rate1
  if (typeof fans === 'number' && Number.isFinite(fans)) {
    stats.push(`粉丝 ${formatCount(fans)}`)
  }
  if (typeof rate7 === 'number' && Number.isFinite(rate7)) {
    stats.push(`7日变化 ${formatDelta(rate7)}`)
  }
  if (typeof rate1 === 'number' && Number.isFinite(rate1)) {
    stats.push(`1日变化 ${formatDelta(rate1)}`)
  }
  const sign = author.value?.sign ? normalizeSeoText(author.value.sign) : ''
  const segments = [titlePart]
  if (stats.length > 0) {
    segments.push(stats.join(' · '))
  }
  if (sign) {
    segments.push(`简介：${sign}`)
  }
  segments.push('Bilibili UP 主数据与粉丝趋势')
  return trimSeoText(segments.join(' | '), seoDescriptionMaxLength)
})

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
})

function formatCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }
  const text = String(value)
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

function buildHistoryCsv(items: AuthorHistoryItem[]): string {
  const header = ['时间', '粉丝', '7日变化', '1日变化']
  const rows = items.map(item => [
    formatDateTime(item.createdAt, { fallback: '' }),
    item.fans ?? '',
    item.rate7 ?? '',
    item.rate1 ?? '',
  ])
  const lines = rows.map(row => row.map(value => formatCsvValue(value)).join(','))
  return [header.join(','), ...lines].join('\n')
}

function downloadHistory() {
  if (!canDownloadHistory.value) {
    return
  }
  if (globalThis.document === undefined || globalThis.URL === undefined) {
    return
  }
  const csv = buildHistoryCsv(historyItems.value)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = globalThis.URL.createObjectURL(blob)
  const link = globalThis.document.createElement('a')
  link.href = url
  link.download = mid.value ? `bilibili_${mid.value}_history.csv` : 'bilibili_history.csv'
  link.click()
  globalThis.URL.revokeObjectURL(url)
}

function scrollToHistoryHeader() {
  const target = historyTableHeaderRef.value
  if (!target) {
    return
  }
  target.scrollIntoView({ block: 'start' })
}

function scrollToAggregationHeader() {
  const target = aggregationTableHeaderRef.value
  if (!target) {
    return
  }
  target.scrollIntoView({ block: 'start' })
}

async function goPrevPage() {
  if (currentPage.value <= 1) {
    return
  }
  currentPage.value -= 1
  await nextTick()
  scrollToHistoryHeader()
}

async function goNextPage() {
  if (currentPage.value >= totalPages.value) {
    return
  }
  currentPage.value += 1
  await nextTick()
  scrollToHistoryHeader()
}

async function goPrevAggregationPage() {
  if (aggregationCurrentPage.value <= 1) {
    return
  }
  aggregationCurrentPage.value -= 1
  await nextTick()
  scrollToAggregationHeader()
}

async function goNextAggregationPage() {
  if (aggregationCurrentPage.value >= aggregationTotalPages.value) {
    return
  }
  aggregationCurrentPage.value += 1
  await nextTick()
  scrollToAggregationHeader()
}

function displayAuthorName(value: AuthorDetailItem | null): string {
  if (value?.name && value.name.trim().length > 0) {
    return value.name
  }
  if (value?.mid) {
    return `UP ${value.mid}`
  }
  if (mid.value) {
    return `UP ${mid.value}`
  }
  return 'UP'
}

async function observeAuthor(): Promise<void> {
  if (!canObserve.value || observePending.value) {
    return
  }
  if (!user.value) {
    observeError.value = '请先登录。'
    observeSuccess.value = null
    return
  }

  observePending.value = true
  observeError.value = null
  observeSuccess.value = null

  try {
    const response = await $fetch<ObserveResponse>(
      `/api/bilibili/author/${encodeURIComponent(mid.value)}/observe`,
      {
        method: 'POST',
      },
    )
    observeSuccess.value = `观测已加入队列，剩余 ${formatCount(response.credit)} 积分。`
  }
  catch (error) {
    if (error && typeof error === 'object' && 'data' in error) {
      const maybeData = error.data as { message?: string, statusMessage?: string }
      observeError.value = maybeData.statusMessage ?? maybeData.message ?? '观测失败。'
      return
    }
    observeError.value = '观测失败。'
  }
  finally {
    observePending.value = false
  }
}

const infoRows = computed(() => {
  const item = author.value
  if (!item) {
    return []
  }
  return [
    { label: '粉丝', value: formatCount(item.fans) },
    { label: '7日变化', value: formatDelta(item.rate7) },
    { label: '1日变化', value: formatDelta(item.rate1) },
  ]
})

const historyHeaders = [
  { key: 'createdAt', label: '时间', align: 'text-left' },
  { key: 'fans', label: '粉丝', align: 'text-right' },
  { key: 'rate7', label: '7日变化', align: 'text-right' },
  { key: 'rate1', label: '1日变化', align: 'text-right' },
]

const historySkeletonRows = Array.from({ length: 10 }, (_, index) => index)
const recentStorageKey = 'bilibili_recent_authors'
const recentLimit = 16

function parseRecentAuthors(raw: string | null): RecentAuthorItem[] {
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter((item): item is RecentAuthorItem => {
        if (!item || typeof item !== 'object') {
          return false
        }
        const record = item as Record<string, unknown>
        return typeof record.mid === 'string'
      })
      .map(item => ({
        mid: item.mid,
        name: typeof item.name === 'string' ? item.name : null,
        face: typeof item.face === 'string' ? item.face : null,
      }))
  }
  catch {
    return []
  }
}

function updateRecentAuthors(item: RecentAuthorItem): void {
  if (!import.meta.client || !globalThis.localStorage) {
    return
  }
  const current = parseRecentAuthors(globalThis.localStorage.getItem(recentStorageKey))
  const next = [
    item,
    ...current.filter(entry => entry.mid !== item.mid),
  ].slice(0, recentLimit)
  globalThis.localStorage.setItem(recentStorageKey, JSON.stringify(next))
}

watch(author, (value) => {
  if (!value || !mid.value) {
    return
  }
  updateRecentAuthors({
    mid: mid.value,
    name: value.name ?? null,
    face: value.face ?? null,
  })
})
</script>

<template>
  <section class="flex flex-col items-center border-b-0">
    <div class="w-full max-w-3xl border-b border-[var(--auxline-line)]">
      <div class="flex items-center justify-between gap-4 border-x border-[var(--auxline-line)]">
        <div class="flex min-w-0 items-center gap-4">
          <div
            class="flex h-16 w-16 items-center justify-center overflow-hidden border border-[var(--auxline-line)]
              bg-[var(--auxline-bg-emphasis)] text-[0.7rem] font-mono uppercase tracking-[0.12em]"
            aria-hidden="true"
          >
            <NuxtImg
              v-if="author?.face"
              :src="author.face"
              alt=""
              class="h-full w-full object-cover"
              width="64"
              height="64"
            />
            <span v-else>
              {{ displayAuthorName(author).slice(0, 1) }}
            </span>
          </div>
          <div class="flex min-w-0 flex-col">
            <h1 class="text-2xl  truncate">
              {{ displayAuthorName(author) }}
            </h1>
            <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
              UP {{ mid }}
            </span>
          </div>
        </div>
        <div class="flex flex-col items-end gap-1">
          <template v-if="user">
            <AuxlineBtn
              type="button"
              size="sm"
              :loading="observePending"
              :disabled="!canObserve"
              @click="observeAuthor"
            >
              观测 -{{ observeCost }}积分
            </AuxlineBtn>
            <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
              当前积分 {{ formatCount(user.credit) }}
            </span>
          </template>
          <template v-else>
            <AuxlineBtn
              size="sm"
              to="/login"
            >
              登录后观测
            </AuxlineBtn>
            <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)] px-2">
              观测消耗 {{ observeCost }} 积分
            </span>
          </template>
        </div>
      </div>
      <p
        v-if="observeError"
        class="border-x border-[var(--auxline-line)] px-2 py-2 text-xs text-red-600"
      >
        {{ observeError }}
      </p>
      <p
        v-else-if="observeSuccess"
        class="border-x border-[var(--auxline-line)] px-2 py-2 text-xs text-blue-600"
      >
        {{ observeSuccess }}
      </p>
    </div>

    <div class="w-full max-w-3xl">
      <template v-if="pending">
        <div class="flex flex-col gap-3 px-4 py-6">
          <span class="h-4 w-32 bg-[var(--auxline-bg-emphasis)]" />
          <span class="h-4 w-24 bg-[var(--auxline-bg-emphasis)]" />
          <span class="h-4 w-28 bg-[var(--auxline-bg-emphasis)]" />
        </div>
      </template>
      <template v-else-if="author">
        <div class="border-b border-[var(--auxline-line)] px-2 py-2 border-x border-[var(--auxline-line)]">
          <p class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
            简介
          </p>
          <p class="mt-2 text-sm whitespace-pre-line">
            {{ author.sign || '暂无简介' }}
          </p>
        </div>
        <div class="grid grid-cols-1 gap-4 border-b border-[var(--auxline-line)] sm:border-x sm:grid-cols-3">
          <div v-for="item in infoRows" :key="item.label" class="flex flex-col gap-1">
            <span class="px-2 text-sm tracking-[0.12em] text-[var(--auxline-fg-muted)]">
              {{ item.label }}
            </span>
            <span class="px-2 text-lg">
              {{ item.value }}
            </span>
          </div>
        </div>
        <div class="sm:border-x border-[var(--auxline-line)]">
          <div class="flex flex-col gap-2 sm:flex-row border-b border-[var(--auxline-line)] sm:items-center sm:justify-between">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm px-2 font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
                历史数据
              </p>
              <AuxlineBtn
                type="button"
                size="sm"
                :disabled="!canDownloadHistory"
                @click="downloadHistory"
              >
                下载
              </AuxlineBtn>
            </div>
            <div class="flex items-center gap-2 px-2">
              <span class="text-sm font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
                共 {{ totalHistory }} 条
              </span>
            </div>
          </div>
          <div class="border-[var(--auxline-line)] border-b divide-y divide-[var(--auxline-line)]">
            <BilibiliAuthorFansHistoryChart
              :items="historyItems"
              :loading="historyPending"
              :height="220"
            />
            <BilibiliAuthorFansHistoryHeatmap
              :items="historyItems"
              :loading="historyPending"
            />
          </div>
          <div class="overflow-x-auto border-[var(--auxline-line)]">
            <div class="min-w-[560px] divide-y divide-[var(--auxline-line)]">
              <div
                ref="historyTableHeaderRef"
                class="grid grid-cols-4 gap-3 px-3 py-2 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
              >
                <span
                  v-for="item in historyHeaders"
                  :key="item.key"
                  :class="item.align"
                >
                  {{ item.label }}
                </span>
              </div>
              <template v-if="historyPending">
                <div
                  v-for="index in historySkeletonRows"
                  :key="index"
                  class="grid grid-cols-4 gap-3 px-3 py-2"
                >
                  <span
                    v-for="cellIndex in 4"
                    :key="cellIndex"
                    class="h-4 w-full bg-[var(--auxline-bg-emphasis)]"
                    aria-hidden="true"
                  />
                </div>
              </template>
              <div
                v-else-if="totalHistory === 0"
                class="px-3 py-6 text-center text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
              >
                暂无历史数据
              </div>
              <template v-else>
                <div
                  v-for="row in pagedHistory"
                  :key="row.id"
                  class="grid grid-cols-4 gap-3 px-3 py-2 text-xs"
                >
                  <span class="text-left whitespace-nowrap">
                    {{ formatTimestamp(row.createdAt) }}
                  </span>
                  <span class="text-right tabular-nums">
                    {{ formatCount(row.fans) }}
                  </span>
                  <span class="text-right tabular-nums">
                    {{ formatDelta(row.rate7) }}
                  </span>
                  <span class="text-right tabular-nums">
                    {{ formatDelta(row.rate1) }}
                  </span>
                </div>
              </template>
            </div>
          </div>
          <div
            v-if="totalHistory > 0"
            class="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--auxline-line)]"
          >
            <button
              type="button"
              class="border-r border-[var(--auxline-line)] px-3 py-1 text-xs font-mono uppercase tracking-[0.12em]
                text-[var(--auxline-fg)] transition-colors hover:bg-[var(--auxline-bg-hover)]
                disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="currentPage <= 1"
              @click="goPrevPage"
            >
              上一页
            </button>
            <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
              第 {{ totalPages === 0 ? 0 : currentPage }} / {{ totalPages }} 页
            </span>
            <button
              type="button"
              class="border-l border-[var(--auxline-line)] px-3 py-1 text-xs font-mono uppercase tracking-[0.12em]
                text-[var(--auxline-fg)] transition-colors hover:bg-[var(--auxline-bg-hover)]
                disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="totalPages === 0 || currentPage >= totalPages"
              @click="goNextPage"
            >
              下一页
            </button>
          </div>
          <p v-if="historyError" class="mt-4 text-xs font-mono uppercase tracking-[0.12em] text-red-500">
            历史数据加载失败
          </p>
        </div>
        <div class="border h-4 auxline-stripe-mask border-[var(--auxline-line)]" />
        <div class="sm:border-x border-[var(--auxline-line)]">
          <div class="flex flex-col gap-2 sm:flex-row border-b border-[var(--auxline-line)] sm:items-center sm:justify-between">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm px-2 font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
                直播礼物聚合
              </p>
              <template v-if="aggregationRoomId">
                <a
                  :href="liveRoomLink(aggregationRoomId)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-2 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]
                    hover:text-[var(--auxline-fg)]"
                >
                  ROOM {{ aggregationRoomId }}
                </a>
              </template>
            </div>
            <div class="flex flex-wrap items-center gap-3 px-2 justify-end">
              <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
                日合计金额 {{ formatAmountValue(aggregationTotals?.day ?? null) }}
              </span>
              <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
                周合计金额 {{ formatAmountValue(aggregationTotals?.week ?? null) }}
              </span>
              <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
                月合计金额 {{ formatAmountValue(aggregationTotals?.month ?? null) }}
              </span>
              <span
                v-if="aggregationTotal > 0"
                class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
              >
                共 {{ aggregationTotal }} 条
              </span>
            </div>
          </div>
          <div class="border-[var(--auxline-line)] border-b divide-y divide-[var(--auxline-line)]">
            <template v-if="aggregationPending">
              <div
                v-for="index in aggregationSkeletonRows"
                :key="index"
                class="grid gap-3 px-3 py-2"
                :style="{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }"
              >
                <span
                  v-for="cellIndex in 4"
                  :key="cellIndex"
                  class="h-4 w-full bg-[var(--auxline-bg-emphasis)]"
                  aria-hidden="true"
                />
              </div>
            </template>
            <div
              v-else-if="!aggregationRoomId"
              class="px-3 py-6 text-center text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
            >
              暂无直播间数据
            </div>
            <div
              v-else-if="aggregationColumns.length === 0"
              class="px-3 py-6 text-center text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
            >
              暂无礼物聚合数据
            </div>
            <template v-else>
              <div
                ref="aggregationTableHeaderRef"
                class="grid gap-3 px-3 py-2 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
                :style="{ gridTemplateColumns: `repeat(${aggregationColumns.length}, minmax(0, 1fr))` }"
              >
                <span v-for="column in aggregationColumns" :key="column">
                  {{ normalizeColumnLabel(column) }}
                </span>
              </div>
              <template v-if="aggregationItems.length === 0">
                <div
                  class="px-3 py-6 text-center text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
                >
                  暂无礼物聚合数据
                </div>
              </template>
              <template v-else>
                <div
                  v-for="(row, rowIndex) in aggregationPagedItems"
                  :key="rowIndex"
                  class="grid gap-3 px-3 py-2 text-xs"
                  :style="{ gridTemplateColumns: `repeat(${aggregationColumns.length}, minmax(0, 1fr))` }"
                >
                  <span
                    v-for="column in aggregationColumns"
                    :key="column"
                    :class="[
                      isNumericColumn(column, row[column] ?? null) ? 'text-right tabular-nums' : 'text-left',
                      isTimeColumn(column) ? 'whitespace-nowrap' : '',
                    ]"
                  >
                    {{ formatAggregationValue(column, row[column] ?? null) }}
                  </span>
                </div>
              </template>
            </template>
          </div>
          <div
            v-if="aggregationTotal > 0"
            class="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--auxline-line)]"
          >
            <button
              type="button"
              class="border-r border-[var(--auxline-line)] px-3 py-1 text-xs font-mono uppercase tracking-[0.12em]
                text-[var(--auxline-fg)] transition-colors hover:bg-[var(--auxline-bg-hover)]
                disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="aggregationCurrentPage <= 1"
              @click="goPrevAggregationPage"
            >
              上一页
            </button>
            <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
              第 {{ aggregationTotalPages === 0 ? 0 : aggregationCurrentPage }} / {{ aggregationTotalPages }} 页
            </span>
            <button
              type="button"
              class="border-l border-[var(--auxline-line)] px-3 py-1 text-xs font-mono uppercase tracking-[0.12em]
                text-[var(--auxline-fg)] transition-colors hover:bg-[var(--auxline-bg-hover)]
                disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="aggregationTotalPages === 0 || aggregationCurrentPage >= aggregationTotalPages"
              @click="goNextAggregationPage"
            >
              下一页
            </button>
          </div>
          <p v-if="aggregationError" class="mt-4 text-xs font-mono uppercase tracking-[0.12em] text-red-500">
            直播礼物聚合加载失败
          </p>
        </div>
      </template>
      <div
        v-else
        class="px-4 py-6 text-center text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
      >
        未找到该 UP
      </div>
      <p v-if="error" class="mt-4 px-4 text-xs font-mono uppercase tracking-[0.12em] text-red-500">
        详情加载失败
      </p>
    </div>
  </section>
</template>
