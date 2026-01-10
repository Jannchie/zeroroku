<script setup lang="ts">
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

function displayName(item: FansRankingItem): string {
  if (item.name && item.name.trim().length > 0) {
    return item.name
  }
  return item.mid ? `UP ${item.mid}` : '未知'
}

const skeletonRows = Array.from({ length: 50 }, (_, index) => index)
</script>

<template>
  <section class="flex flex-col items-center pt-12 pb-12">
    <h1 class="text-3xl font-bold text-center">
      {{ props.title }}
    </h1>
    <p class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)] w-full border-b text-center border-[var(--auxline-line)] pb-2 mt-2">
      {{ props.subtitle }}
    </p>
    <div class="w-full">
      <BilibiliFansRankingNav />
    </div>
    <div class="w-full border-b border-[var(--auxline-line)]">
      <div class="max-w-3xl mx-auto">
        <div class="flex items-center justify-between border-b sm:border-x border-[var(--auxline-line)] py-3 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
          <span class="px-1">排名</span>
          <span class="text-left flex-1 pl-4">UP</span>
          <span class="px-1">{{ props.valueLabel }}</span>
        </div>
        <template v-if="pending">
          <div
            v-for="index in skeletonRows"
            :key="index"
            class="flex items-center justify-between border-b border-[var(--auxline-line)] last:border-b-0 sm:border-x"
          >
            <span class="w-10 px-1 text-sm font-mono text-transparent">
              00
            </span>
            <div class="flex flex-1 items-center gap-3 pl-4">
              <div
                class="h-9 w-9 bg-[var(--auxline-bg-emphasis)]"
                aria-hidden="true"
              />
              <div class="flex flex-col">
                <span class="h-4 w-32 bg-[var(--auxline-bg-emphasis)]" />
                <span class="mt-1 h-3 w-20 bg-[var(--auxline-bg-emphasis)]" />
              </div>
            </div>
            <div class="flex flex-col items-end gap-1 px-1">
              <span class="block h-4 w-16 bg-[var(--auxline-bg-emphasis)]" />
              <template v-if="props.showTrendMeta">
                <span class="block h-3 w-24 bg-[var(--auxline-bg-emphasis)]" />
              </template>
            </div>
          </div>
        </template>
        <template v-else>
          <div
            v-for="(item, index) in data?.items ?? []"
            :key="item.mid"
            class="flex items-center justify-between border-b border-[var(--auxline-line)] last:border-b-0 sm:border-x"
          >
            <span class="w-10 px-1 text-sm font-mono">
              {{ String(index + 1).padStart(2, '0') }}
            </span>
            <div class="flex flex-1 items-center gap-3 pl-4">
              <div
                class="flex h-9 w-9 items-center justify-center overflow-hidden border border-[var(--auxline-line)] bg-[var(--auxline-bg-emphasis)] text-[0.6rem] font-mono uppercase tracking-[0.12em]"
                aria-hidden="true"
              >
                <NuxtImg
                  v-if="item.face"
                  :src="item.face"
                  alt=""
                  class="h-full w-full object-cover"
                  width="36"
                  height="36"
                />
                <span v-else>
                  {{ displayName(item).slice(0, 1) }}
                </span>
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-semibold">
                  {{ displayName(item) }}
                </span>
                <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
                  {{ item.mid }}
                </span>
              </div>
            </div>
            <div class="flex flex-col items-end gap-1 px-1">
              <span class="text-[0.65rem] font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
                {{ formatValue(item[props.valueKey]) }}
              </span>
              <template v-if="props.showTrendMeta">
                <span class="text-[0.65rem] font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
                  {{ formatCount(item.fans) }} · {{ formatPercent(item.delta, item.fans) }}
                </span>
              </template>
            </div>
          </div>
          <div
            v-if="data && data.items.length === 0"
            class="py-6 text-center text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)] border-l border-r border-[var(--auxline-line)]"
          >
            暂无数据
          </div>
        </template>
        <p
          v-if="error"
          class="mt-4 text-xs font-mono uppercase tracking-[0.12em] text-red-500"
        >
          排行榜加载失败
        </p>
      </div>
    </div>
  </section>
</template>
