<script setup lang="ts">
import { computed } from 'vue'

interface UserExpRankItem {
  id: string
  name: string | null
  exp: number
}

interface UserExpRankResponse {
  items: UserExpRankItem[]
}

useSeoMeta({
  title: '观测者排行榜',
  description: '观测者经验 TOP 100 排行榜，展示用户 EXP 排名与数据。',
  ogTitle: '观测者排行榜',
  ogDescription: '观测者经验 TOP 100 排行榜，展示用户 EXP 排名与数据。',
})

const { data, pending, error } = useFetch<UserExpRankResponse>('/api/rank', {
  watch: false,
})

const formatter = new Intl.NumberFormat('zh-CN')
const stripeOffsetRem = 5.75
const skeletonRows = Array.from({ length: 12 }, (_, index) => index)

function formatExp(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '--'
  }
  return formatter.format(Number.isFinite(value) ? value : 0)
}

const topExp = computed(() => {
  const items = data.value?.items
  if (!items || items.length === 0) {
    return 0
  }
  const value = items[0]?.exp ?? 0
  return Math.abs(Number.isFinite(value) ? value : 0)
})

function barRatio(item: UserExpRankItem): number {
  const base = topExp.value
  if (base <= 0) {
    return 0
  }
  const value = Number.isFinite(item.exp) ? Math.abs(item.exp) : 0
  return Math.min(value / base, 1)
}

function barStyle(item: UserExpRankItem): Record<string, string> {
  const ratio = Math.max(barRatio(item), 0)
  return {
    left: `${stripeOffsetRem}rem`,
    width: ratio <= 0
      ? '0%'
      : `calc(${ratio * 100}% - ${ratio * stripeOffsetRem}rem)`,
  }
}

function displayName(item: UserExpRankItem): string {
  if (item.name && item.name.trim().length > 0) {
    return item.name
  }
  return item.id ? `用户 ${item.id.slice(0, 6)}` : '未知'
}
</script>

<template>
  <section class="flex flex-col items-center pb-12">
    <AuxlinePageHeader
      title="观测者排行榜"
      subtitle="TOP 100"
    />
    <div class="w-full border-b border-[var(--auxline-line)]">
      <div class="max-w-3xl mx-auto">
        <div class="flex items-center justify-between border-b border-l border-r border-[var(--auxline-line)] py-3 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
          <span class="px-1">排名</span>
          <span class="text-left flex-1 pl-4">用户</span>
          <span class="px-1">EXP</span>
        </div>
        <template v-if="pending">
          <div
            v-for="index in skeletonRows"
            :key="index"
            class="relative overflow-hidden border-b border-l border-r border-[var(--auxline-line)] last:border-b-0"
          >
            <div class="relative z-10 flex w-full items-center justify-between">
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
              <span class="px-1">
                <span class="block h-4 w-16 bg-[var(--auxline-bg-emphasis)]" />
              </span>
            </div>
          </div>
        </template>
        <template v-else>
          <div
            v-for="(item, index) in data?.items ?? []"
            :key="item.id"
            class="relative overflow-hidden border-b border-l border-r border-[var(--auxline-line)] last:border-b-0"
          >
            <span
              class="absolute inset-y-0 z-0 pointer-events-none auxline-stripe-mask"
              :style="barStyle(item)"
              aria-hidden="true"
            />
            <div class="relative z-10 flex w-full items-center justify-between">
              <span class="w-10 px-1 text-sm font-mono">
                {{ String(index + 1).padStart(2, '0') }}
              </span>
              <div class="flex flex-1 items-center gap-3 pl-4">
                <div
                  class="flex h-9 w-9 items-center justify-center overflow-hidden border-x border-[var(--auxline-line)]
                    bg-[var(--auxline-bg-emphasis)] text-xs font-mono uppercase tracking-[0.12em]"
                  aria-hidden="true"
                >
                  <span>
                    {{ displayName(item).slice(0, 1) }}
                  </span>
                </div>
                <div class="flex flex-col">
                  <span class="text-sm">
                    {{ displayName(item) }}
                  </span>
                </div>
              </div>
              <span class="text-sm px-1 font-mono">
                {{ formatExp(item.exp) }}
              </span>
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
