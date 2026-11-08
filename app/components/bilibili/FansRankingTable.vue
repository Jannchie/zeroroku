<script setup lang="ts">
import { computed } from 'vue'

interface FansRankingItem {
  mid: string
  name: string | null
  face: string | null
  [key: string]: string | number | null
}

interface FansRankingResponse {
  items: FansRankingItem[]
}

const props = withDefaults(defineProps<{
  title: string
  subtitle: string
  valueLabel: string
  apiUrl: string
  valueKey: string
  showSign?: boolean
  showTrendMeta?: boolean
}>(), {
  showSign: false,
  showTrendMeta: false,
})

const { data, pending, error } = useFetch<FansRankingResponse>(() => props.apiUrl, {
  watch: false,
})

const formatter = new Intl.NumberFormat('zh-CN', props.showSign ? { signDisplay: 'exceptZero' } : {})
const countFormatter = new Intl.NumberFormat('zh-CN')
const percentFormatter = new Intl.NumberFormat('zh-CN', {
  signDisplay: 'exceptZero',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '--'
  }
  if (typeof value === 'number') {
    return formatter.format(Number.isFinite(value) ? value : 0)
  }
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) {
    return '--'
  }
  return formatter.format(parsed)
}

function parseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? null : parsed
}

function formatCount(value: string | number | null | undefined): string {
  const parsed = parseNumber(value)
  if (parsed === null) {
    return '--'
  }
  return countFormatter.format(parsed)
}

function formatPercent(delta: string | number | null | undefined, total: string | number | null | undefined): string {
  const deltaValue = parseNumber(delta)
  const totalValue = parseNumber(total)
  if (deltaValue === null || totalValue === null) {
    return '--'
  }
  const base = totalValue - deltaValue
  if (!Number.isFinite(base) || base <= 0) {
    return '--'
  }
  const percent = (deltaValue / base) * 100
  if (!Number.isFinite(percent)) {
    return '--'
  }
  return `${percentFormatter.format(percent)}%`
}

const topValue = computed(() => {
  const items = data.value?.items
  if (!items || items.length === 0) {
    return 0
  }
  const value = parseNumber(items[0]?.[props.valueKey])
  if (value === null) {
    return 0
  }
  return Math.abs(value)
})

function barRatio(item: FansRankingItem): number {
  const base = topValue.value
  if (base <= 0) {
    return 0
  }
  const value = parseNumber(item[props.valueKey])
  if (value === null) {
    return 0
  }
  return Math.min(Math.abs(value) / base, 1)
}

function displayName(item: FansRankingItem): string {
  if (item.name && item.name.trim().length > 0) {
    return item.name
  }
  return item.mid ? `UP ${item.mid}` : '未知'
}

function buildAuthorLink(mid: string | null | undefined): string | null {
  if (!mid) {
    return null
  }
  const trimmed = mid.trim()
  if (!trimmed) {
    return null
  }
  return `/bilibili/author/${encodeURIComponent(trimmed)}`
}

function isAuthorLinkable(mid: string | null | undefined): boolean {
  return buildAuthorLink(mid) !== null
}

function authorLink(mid: string | null | undefined): string {
  return buildAuthorLink(mid) ?? ''
}

const NuxtLinkComponent = resolveComponent('NuxtLink')
const skeletonRows = Array.from({ length: 50 }, (_, index) => index)
</script>

<template>
  <section class="flex w-full flex-col pb-12">
    <AuxlinePageHeader
      :bordered="false"
      :title="props.title"
      :subtitle="props.subtitle"
    />
    <BilibiliFansRankingNav />
    <div class="zr-row-head">
      <span class="flex items-center gap-3">
        <span class="zr-rank">#</span>
        <span>UP 主</span>
      </span>
      <span>{{ props.valueLabel }}</span>
    </div>
    <template v-if="pending">
      <div v-for="index in skeletonRows" :key="index" class="zr-row">
        <span class="h-3 w-8 rounded bg-[var(--auxline-bg-emphasis)]" />
        <span class="h-10 w-10 shrink-0 rounded-full bg-[var(--auxline-bg-emphasis)]" aria-hidden="true" />
        <span class="flex flex-1 flex-col gap-1.5">
          <span class="h-3.5 w-32 rounded bg-[var(--auxline-bg-emphasis)]" />
          <span class="h-3 w-20 rounded bg-[var(--auxline-bg-emphasis)]" />
        </span>
        <span class="h-3.5 w-20 rounded bg-[var(--auxline-bg-emphasis)]" />
      </div>
    </template>
    <template v-else>
      <component
        :is="isAuthorLinkable(item.mid) ? NuxtLinkComponent : 'div'"
        v-for="(item, index) in data?.items ?? []"
        :key="item.mid"
        :to="isAuthorLinkable(item.mid) ? authorLink(item.mid) : undefined"
        class="zr-row relative overflow-hidden"
        :class="isAuthorLinkable(item.mid) ? 'zr-row-link' : ''"
      >
        <!-- 数值条：从左往右的斜线底纹，长度按第一名归一 -->
        <span
          class="auxline-stripe-mask pointer-events-none absolute inset-y-0 left-0 opacity-50"
          :style="{ width: `${barRatio(item) * 100}%` }"
          aria-hidden="true"
        />
        <span class="zr-rank relative">
          {{ index + 1 }}
        </span>
        <AuxlineAvatar :src="item.face" :name="displayName(item)" :size="40" class="relative" />
        <span class="relative flex min-w-0 flex-1 flex-col">
          <span class="zr-row-name truncate">{{ displayName(item) }}</span>
          <span class="zr-row-meta font-mono">{{ item.mid }}</span>
        </span>
        <span class="relative flex shrink-0 flex-col items-end">
          <span class="zr-row-value">{{ formatValue(item[props.valueKey]) }}</span>
          <span v-if="props.showTrendMeta" class="zr-row-meta">
            <span class="hidden sm:inline">{{ formatCount(item.fans) }} · </span>{{ formatPercent(item.delta, item.fans) }}
          </span>
        </span>
      </component>
      <p
        v-if="data && data.items.length === 0"
        class="zr-empty"
      >
        暂无数据
      </p>
    </template>
    <p v-if="error" class="px-[var(--zr-gutter)] py-4 text-xs text-red-500">
      排行榜加载失败
    </p>
  </section>
</template>
