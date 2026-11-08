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

function displayName(item: UserExpRankItem): string {
  if (item.name && item.name.trim().length > 0) {
    return item.name
  }
  return item.id ? `用户 ${item.id.slice(0, 6)}` : '未知'
}
</script>

<template>
  <section class="flex w-full flex-col pb-12">
    <AuxlinePageHeader
      title="观测者排行榜"
      subtitle="经验值前 100 名"
    />
    <div class="zr-row-head">
      <span class="flex items-center gap-3">
        <span class="zr-rank">#</span>
        <span>用户</span>
      </span>
      <span>经验</span>
    </div>
    <template v-if="pending">
      <div v-for="index in skeletonRows" :key="index" class="zr-row">
        <span class="h-3 w-8 rounded bg-[var(--auxline-bg-emphasis)]" />
        <span class="h-8 w-8 shrink-0 rounded-full bg-[var(--auxline-bg-emphasis)]" aria-hidden="true" />
        <span class="h-3.5 flex-1 rounded bg-[var(--auxline-bg-emphasis)]" />
        <span class="h-3.5 w-16 rounded bg-[var(--auxline-bg-emphasis)]" />
      </div>
    </template>
    <template v-else>
      <div
        v-for="(item, index) in data?.items ?? []"
        :key="item.id"
        class="zr-row relative overflow-hidden"
      >
        <span
          class="auxline-stripe-mask pointer-events-none absolute inset-y-0 left-0 opacity-50"
          :style="{ width: `${barRatio(item) * 100}%` }"
          aria-hidden="true"
        />
        <span class="zr-rank relative">{{ index + 1 }}</span>
        <AuxlineAvatar :name="displayName(item)" :size="32" class="relative" />
        <span class="zr-row-name relative min-w-0 flex-1 truncate">{{ displayName(item) }}</span>
        <span class="zr-row-value relative shrink-0">{{ formatExp(item.exp) }}</span>
      </div>
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
