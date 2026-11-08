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
  key: 'sponsors',
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
  <section class="flex w-full flex-col pb-12">
    <AuxlinePageHeader
      title="赞助者"
      subtitle="感谢每一位支持者"
    />
    <div class="flex flex-wrap items-center gap-2 border-b border-[var(--auxline-line)] px-[var(--zr-gutter)] py-3">
      <span class="text-xs text-[var(--auxline-fg-muted)]">赞助入口</span>
      <a
        v-for="action in sponsorActions"
        :key="action.href"
        :href="action.href"
        target="_blank"
        rel="noreferrer"
        class="zr-chip !pl-2.5"
      >
        {{ action.label }}
        <span class="i-heroicons-arrow-up-right h-3 w-3" aria-hidden="true" />
      </a>
    </div>
    <div class="zr-row-head">
      <span>赞助者<template v-if="sponsorItems.length > 0"> · {{ sponsorItems.length }}</template></span>
      <span>金额</span>
    </div>
    <template v-if="pending">
      <div v-for="index in skeletonRows" :key="`sponsor-skeleton-${index}`" class="zr-row justify-between">
        <span class="h-3.5 w-32 rounded bg-[var(--auxline-bg-emphasis)]" />
        <span class="h-3.5 w-10 rounded bg-[var(--auxline-bg-emphasis)]" />
      </div>
    </template>
    <template v-else>
      <div v-for="item in sponsorItems" :key="item.id" class="zr-row !min-h-12 justify-between text-sm">
        <span class="truncate">{{ displaySponsorName(item.name) }}</span>
        <span class="shrink-0 text-[var(--auxline-fg-2)]">{{ formatAmount(item.amount) }}</span>
      </div>
      <p v-if="sponsorItems.length === 0" class="zr-empty">
        暂无赞助者
      </p>
    </template>
    <p v-if="error" class="px-[var(--zr-gutter)] py-4 text-xs text-red-600">
      赞助列表加载失败
    </p>
  </section>
</template>
