<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface FansRankingItem {
  mid: string
  name: string | null
  face: string | null
  fans: number
}

interface FansRankingResponse {
  items: FansRankingItem[]
}

const { data, pending, error, refresh } = useFetch<FansRankingResponse>('/api/bilibili/fans-ranking', {
  server: false,
  immediate: false,
})

const hydrated = ref(false)

onMounted(() => {
  hydrated.value = true
  void refresh()
})

const formatter = new Intl.NumberFormat('zh-CN')

function formatFans(value: number): string {
  return formatter.format(value)
}

function displayName(item: FansRankingItem): string {
  if (item.name && item.name.trim().length > 0) {
    return item.name
  }
  return item.mid ? `用户 ${item.mid}` : '未知'
}
</script>

<template>
  <section class="flex flex-col items-center pt-12 pb-12">
    <h1 class="text-3xl font-bold text-center">
      粉丝总数排行榜
    </h1>
    <p class="text-xs font-mono pb-4 uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)] w-full border-b text-center border-[var(--auxline-line)] pb-2 mt-2">
      Bilibili Fans Ranking
    </p>
    <div class="w-full border-b border-[var(--auxline-line)]">
      <div class="max-w-3xl mx-auto border-x border-[var(--auxline-line)] pb-4">
        <div class="flex items-center justify-between border-b border-[var(--auxline-line)] py-3 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
          <span class="px-1">排名</span>
          <span class="text-left flex-1 pl-4">UP</span>
          <span class="px-1">粉丝</span>
        </div>
        <div
          v-for="(item, index) in data?.items ?? []"
          :key="item.mid"
          class="flex items-center justify-between border-b border-[var(--auxline-line)]"
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
          <span class="text-sm px-1 font-mono">
            {{ formatFans(item.fans) }}
          </span>
        </div>
        <div v-if="hydrated && pending" class="py-6 text-center text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
          排行榜加载中...
        </div>
        <div
          v-else-if="data && data.items.length === 0"
          class="py-6 text-center text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
        >
          暂无数据
        </div>
        <p
          v-if="hydrated && error"
          class="mt-4 text-xs font-mono uppercase tracking-[0.12em] text-red-500"
        >
          排行榜加载失败
        </p>
      </div>
    </div>
  </section>
</template>
