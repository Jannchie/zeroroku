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

const pageTitle = computed(() => `直播礼物排行榜 · 近${windowLabel.value}`)

useSeoMeta({
  title: pageTitle,
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
  <section class="flex flex-col items-center pb-12">
    <AuxlinePageHeader
      title="直播礼物排行榜"
      subtitle="Live Room Gift Ranking"
    />
    <div class="w-full border-b border-[var(--auxline-line)]">
      <div class="max-w-3xl mx-auto">
        <div class="flex items-center justify-between border-b sm:border-x border-[var(--auxline-line)] py-3 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
          <span class="px-1">排名</span>
          <span class="text-left flex-1 pl-4">直播间</span>
          <span class="px-1">礼物价值</span>
        </div>
        <div class="border-b sm:border-x border-[var(--auxline-line)] px-3 py-2 text-[0.65rem] font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
          统计窗口：近{{ windowLabel }}
        </div>
        <template v-if="pending">
          <div
            v-for="index in skeletonRows"
            :key="index"
            class="relative overflow-hidden border-b border-[var(--auxline-line)] last:border-b-0 sm:border-x"
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
                  <span class="mt-1 h-3 w-24 bg-[var(--auxline-bg-emphasis)]" />
                </div>
              </div>
              <div class="flex flex-col items-end gap-1 px-1">
                <span class="block h-4 w-20 bg-[var(--auxline-bg-emphasis)]" />
                <span class="block h-3 w-12 bg-[var(--auxline-bg-emphasis)]" />
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <div
            v-for="(item, index) in items"
            :key="item.roomId"
            class="relative overflow-hidden border-b border-[var(--auxline-line)] last:border-b-0 sm:border-x"
          >
            <div class="relative z-10 flex w-full items-center justify-between">
              <span class="w-10 px-1 text-sm font-mono">
                {{ String(index + 1).padStart(2, '0') }}
              </span>
              <div class="flex flex-1 items-center gap-3 pl-4 min-w-0">
                <div
                  class="flex h-9 w-9 items-center justify-center overflow-hidden border-x border-[var(--auxline-line)]
                    bg-[var(--auxline-bg-emphasis)] text-[0.6rem] font-mono uppercase tracking-[0.12em]"
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
                <div class="flex flex-col min-w-0">
                  <span class="text-sm truncate">
                    {{ displayName(item) }}
                  </span>
                  <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
                    <a
                      :href="roomLink(item.roomId)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="hover:text-[var(--auxline-fg)]"
                    >
                      ROOM {{ item.roomId }}
                    </a>
                    <template v-if="item.mid">
                      · MID {{ item.mid }}
                    </template>
                  </span>
                </div>
              </div>
              <div class="flex flex-col items-end gap-1 px-1">
                <span class="text-[0.65rem] font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
                  {{ formatAmount(item.amount) }}
                </span>
                <span class="text-[0.65rem] font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
                  {{ formatCount(item.gifts) }} gifts
                </span>
              </div>
            </div>
          </div>
          <div
            v-if="items.length === 0"
            class="py-6 text-center text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)] border-b sm:border-x border-[var(--auxline-line)]"
          >
            暂无数据
          </div>
        </template>
        <p
          v-if="error"
          class="mt-4 text-xs font-mono uppercase tracking-[0.12em] text-red-500"
        >
          直播排行榜加载失败
        </p>
      </div>
    </div>
  </section>
</template>
