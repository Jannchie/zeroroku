<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

interface AuthorDetailItem {
  mid: string
  name: string | null
  face: string | null
  sign: string | null
  sex: string | null
  level: number | null
  topPhoto: string | null
  fans: number | null
}

interface AuthorDetailResponse {
  item: AuthorDetailItem | null
}

const route = useRoute()
const midParam = computed(() => (Array.isArray(route.params.mid) ? route.params.mid[0] : route.params.mid))
const mid = computed(() => (typeof midParam.value === 'string' ? midParam.value : ''))

const { data, pending, error } = useFetch<AuthorDetailResponse>(
  () => `/api/bilibili/author/${encodeURIComponent(mid.value)}`,
  {
    watch: [mid],
  },
)

const author = computed(() => data.value?.item ?? null)
const formatter = new Intl.NumberFormat('zh-CN')

function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '--'
  }
  return formatter.format(Number.isFinite(value) ? value : 0)
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

const infoRows = computed(() => {
  const item = author.value
  if (!item) {
    return []
  }
  return [
    { label: '粉丝', value: formatCount(item.fans) },
    { label: '等级', value: item.level === null ? '--' : String(item.level) },
    { label: '性别', value: item.sex ?? '--' },
  ]
})
</script>

<template>
  <section class="flex flex-col items-center pt-12 pb-12">
    <div class="w-full max-w-3xl border-b border-[var(--auxline-line)]">
      <div class="flex items-center gap-4 px-4 py-6">
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
        <div class="grid grid-cols-1 gap-4 border-b border-[var(--auxline-line)] px-4 py-6 sm:grid-cols-3">
          <div v-for="item in infoRows" :key="item.label" class="flex flex-col gap-1">
            <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
              {{ item.label }}
            </span>
            <span class="text-sm">
              {{ item.value }}
            </span>
          </div>
        </div>
        <div class="px-4 py-6">
          <p class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
            简介
          </p>
          <p class="mt-2 text-sm whitespace-pre-line">
            {{ author.sign || '暂无简介' }}
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
