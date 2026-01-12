<script setup lang="ts">
import { computed } from 'vue'

interface SponsorItem {
  id: string
  name: string
  amount: number
  sponsoredAt: string
}

interface SponsorResponse {
  items: SponsorItem[]
}

const sponsorActions: { label: string, href: string }[] = [
  { label: '爱发电', href: 'https://afdian.com/a/jannchie' },
  { label: 'AZZ', href: 'https://azz.net/jannchie' },
  { label: 'B站充电', href: 'https://space.bilibili.com/1850091' },
]

useSeoMeta({
  title: '赞助者',
})

const { data, pending, error } = useFetch<SponsorResponse>('/api/sponsors', {
  watch: false,
})

const sponsorItems = computed(() => data.value?.items ?? [])
const skeletonRows = Array.from({ length: 18 }, (_, index) => index)
const formatter = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 })

function formatAmount(value: number): string {
  if (!Number.isFinite(value)) {
    return '--'
  }
  const normalized = value / 100
  return `${formatter.format(normalized)}元`
}

function displaySponsorName(name: string): string {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed : '匿名'
}
</script>

<template>
  <section class="flex flex-col items-center pb-12">
    <AuxlinePageHeader
      title="赞助者"
      subtitle="感谢支持"
    />
    <div class="w-full border-b border-[var(--auxline-line)]">
      <div class="max-w-3xl mx-auto">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-l border-r border-[var(--auxline-line)] py-2 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
          <span class="px-1">赞助入口</span>
          <div class="flex flex-wrap items-center gap-0 px-1">
            <a
              v-for="action in sponsorActions"
              :key="action.href"
              :href="action.href"
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center justify-center px-1 py-0.5 text-[0.65rem]
                text-[var(--auxline-fg)] hover:bg-[var(--auxline-bg-hover)] focus-visible:outline focus-visible:outline-1
                focus-visible:outline-[var(--auxline-line)]"
            >
              {{ action.label }}
            </a>
          </div>
        </div>
        <div class="flex items-center justify-between border-b border-l border-r border-[var(--auxline-line)] py-2 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
          <span class="px-1">赞助者</span>
          <span class="px-1">金额</span>
        </div>
        <template v-if="pending">
          <div
            v-for="index in skeletonRows"
            :key="`sponsor-skeleton-${index}`"
            class="flex items-center justify-between border-b border-l border-r border-[var(--auxline-line)] px-2 py-2 last:border-b-0"
          >
            <span class="h-3 w-32 bg-[var(--auxline-bg-emphasis)]" />
            <span class="h-3 w-10 bg-[var(--auxline-bg-emphasis)]" />
          </div>
        </template>
        <template v-else>
          <div
            v-for="item in sponsorItems"
            :key="item.id"
            class="flex items-center justify-between border-b border-l border-r border-[var(--auxline-line)] px-2 py-2 text-sm last:border-b-0"
          >
            <span class="truncate">{{ displaySponsorName(item.name) }}</span>
            <span class="text-xs font-mono text-[var(--auxline-fg-muted)]">
              {{ formatAmount(item.amount) }}
            </span>
          </div>
          <div
            v-if="sponsorItems.length === 0"
            class="py-6 text-center text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)] border-l border-r border-[var(--auxline-line)]"
          >
            暂无赞助者
          </div>
        </template>
        <p v-if="error" class="mt-4 text-xs font-mono uppercase tracking-[0.12em] text-red-600">
          赞助列表加载失败
        </p>
      </div>
    </div>
  </section>
</template>
