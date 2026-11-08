<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

interface LiveRankItem {
  roomId: string
  mid: string | null
  name: string | null
  face: string | null
  amount: number
  gifts: number
}

interface LiveRankResponse {
  windowMinutes: number
  items: LiveRankItem[]
}

const DEFAULT_WINDOW_MINUTES = 60
const MIN_WINDOW_MINUTES = 10
const MAX_WINDOW_MINUTES = 7 * 24 * 60

const route = useRoute()

const slugParam = computed(() => route.params.slug)
const rawMinutes = computed(() => {
  if (Array.isArray(slugParam.value)) {
    return slugParam.value[0] ?? ''
  }
  if (typeof slugParam.value === 'string') {
    return slugParam.value
  }
  return ''
})

const windowMinutes = computed(() => {
  const parsed = Number.parseInt(rawMinutes.value, 10)
  if (!Number.isFinite(parsed)) {
    return DEFAULT_WINDOW_MINUTES
  }
  const clamped = Math.max(MIN_WINDOW_MINUTES, Math.min(MAX_WINDOW_MINUTES, Math.floor(parsed)))
  return clamped
})

const windowLabel = computed(() => {
  const minutes = windowMinutes.value
  if (minutes % (60 * 24) === 0) {
    return `${minutes / (60 * 24)}天`
  }
  if (minutes % 60 === 0) {
    return `${minutes / 60}小时`
  }
  return `${minutes}分钟`
})

const pageTitle = computed(() => `直播礼物排行榜 · 近${windowLabel.value} · Bilibili`)
const pageDescription = computed(() => `Bilibili 直播礼物排行榜，统计近${windowLabel.value}的礼物价值与热度排行。`)

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
})

const { data, pending, error } = useFetch<LiveRankResponse>(
  () => `/api/bilibili/live/rank?minutes=${windowMinutes.value}`,
  { watch: [windowMinutes] },
)

const items = computed(() => data.value?.items ?? [])
const formatter = new Intl.NumberFormat('zh-CN')
const skeletonRows = Array.from({ length: 20 }, (_, index) => index)

function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--'
  }
  return formatter.format(value)
}

function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--'
  }
  return formatter.format(value)
}

function displayName(item: LiveRankItem): string {
  if (item.name && item.name.trim().length > 0) {
    return item.name
  }
  if (item.mid) {
    return `UP ${item.mid}`
  }
  return item.roomId ? `直播间 ${item.roomId}` : '未知'
}

function roomLink(roomId: string): string {
  return `https://live.bilibili.com/${roomId}`
}
</script>

<template>
  <section class="flex w-full flex-col pb-12">
    <AuxlinePageHeader
      title="直播礼物排行榜"
      :subtitle="`近${windowLabel}直播间礼物价值`"
    />
    <div class="zr-row-head">
      <span class="flex items-center gap-3">
        <span class="zr-rank">#</span>
        <span>直播间</span>
      </span>
      <span>礼物价值</span>
    </div>
    <template v-if="pending">
      <div v-for="index in skeletonRows" :key="index" class="zr-row">
        <span class="h-3 w-8 rounded bg-[var(--auxline-bg-emphasis)]" />
        <span class="h-10 w-10 shrink-0 rounded-full bg-[var(--auxline-bg-emphasis)]" aria-hidden="true" />
        <span class="flex flex-1 flex-col gap-1.5">
          <span class="h-3.5 w-32 rounded bg-[var(--auxline-bg-emphasis)]" />
          <span class="h-3 w-24 rounded bg-[var(--auxline-bg-emphasis)]" />
        </span>
        <span class="h-3.5 w-20 rounded bg-[var(--auxline-bg-emphasis)]" />
      </div>
    </template>
    <template v-else>
      <div v-for="(item, index) in items" :key="item.roomId" class="zr-row">
        <span class="zr-rank">{{ index + 1 }}</span>
        <AuxlineAvatar :src="item.face" :name="displayName(item)" :size="40" />
        <span class="flex min-w-0 flex-1 flex-col">
          <NuxtLink
            v-if="item.mid"
            :to="`/bilibili/author/${item.mid}`"
            class="zr-row-name truncate hover:underline"
          >{{ displayName(item) }}</NuxtLink>
          <span v-else class="zr-row-name truncate">{{ displayName(item) }}</span>
          <span class="zr-row-meta">
            <a
              :href="roomLink(item.roomId)"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-[var(--auxline-fg)]"
            >直播间 <span class="font-mono">{{ item.roomId }}</span></a>
          </span>
        </span>
        <span class="flex shrink-0 flex-col items-end">
          <span class="zr-row-value">{{ formatAmount(item.amount) }}</span>
          <span class="zr-row-meta">{{ formatCount(item.gifts) }} 件礼物</span>
        </span>
      </div>
      <p
        v-if="items.length === 0"
        class="zr-empty"
      >
        暂无数据
      </p>
    </template>
    <p v-if="error" class="px-[var(--zr-gutter)] py-4 text-xs text-red-500">
      直播排行榜加载失败
    </p>
  </section>
</template>
