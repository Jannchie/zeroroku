<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { authClient } from '~~/lib/client'

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

interface ObserveResponse {
  ok: boolean
  cost: number
  credit: number
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

const author = computed(() => data.value?.item ?? null)
const pageTitle = computed(() => {
  const name = author.value?.name?.trim()
  if (name) {
    return `${name} · Bilibili`
  }
  if (mid.value) {
    return `UP ${mid.value} · Bilibili`
  }
  return 'Bilibili'
})

useSeoMeta({
  title: pageTitle,
})

const historyItems = computed(() => historyData.value?.items ?? [])
const formatter = new Intl.NumberFormat('zh-CN')
const deltaFormatter = new Intl.NumberFormat('zh-CN', { signDisplay: 'exceptZero' })
const dateFormatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })
const observeCost = 10
const observePending = ref(false)
const observeError = ref<string | null>(null)
const observeSuccess = ref<string | null>(null)

const pageSize = 100
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

watch(historyItems, () => {
  currentPage.value = 1
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
  return deltaFormatter.format(value)
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return '--'
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return dateFormatter.format(parsed)
}

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
    item.createdAt ?? '',
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

const historySkeletonRows = Array.from({ length: 100 }, (_, index) => index)
</script>

<template>
  <section class="flex flex-col items-center border-b-0">
    <div class="w-full max-w-3xl border-b border-[var(--auxline-line)]">
      <div class="flex items-center justify-between gap-4 border-x border-[var(--auxline-line)] pr-2">
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
            <span class="text-[0.65rem] font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
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
            <span class="text-[0.65rem] font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
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
              <button
                type="button"
                class="flex h-7 w-7 items-center justify-center hover:bg-[var(--auxline-bg-hover)]
                  focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--auxline-line)]"
                aria-label="说明"
                title="历史数据按时间倒序展示，每页 100 条。"
              >
                <span class="text-base i-heroicons-information-circle-20-solid" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div class="border-[var(--auxline-line)] border-b">
            <BilibiliAuthorFansHistoryChart
              :items="historyItems"
              :loading="historyPending"
              :height="220"
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
