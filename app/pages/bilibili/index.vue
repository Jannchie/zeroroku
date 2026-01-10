<script setup lang="ts">
import { onMounted } from 'vue'

interface BilibiliStats {
  videoCount: number
  userCount: number
}

const { data, refresh } = useFetch<BilibiliStats>('/api/bilibili/stats', {
  server: false,
  immediate: false,
})
const formatter = new Intl.NumberFormat('zh-CN')

function formatCount(value: number | undefined): string {
  if (typeof value !== 'number') {
    return '--'
  }
  return formatter.format(value)
}

onMounted(() => {
  void refresh()
})
</script>

<template>
  <section class="flex flex-col items-center">
    <div class="border-b border-[var(--auxline-line)] flex justify-center w-full">
      <AuxlineBtn to="/bilibili/fans" size="sm">
        粉丝排行榜
      </AuxlineBtn>
    </div>
    <div class="w-full flex children:border-r">
      <div class="flex items-center justify-between border-[var(--auxline-line)]">
        <span class="font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)] px-2 border-r border-[var(--auxline-line)]">
          视频
        </span>
        <span class="font-mono min-w-32 px-2">
          {{ formatCount(data?.videoCount) }}
        </span>
      </div>
      <div class="flex items-center justify-between border-[var(--auxline-line)]">
        <span class="font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)] px-2 border-r border-[var(--auxline-line)]">
          UP
        </span>
        <span class="font-mono min-w-32 px-2">
          {{ formatCount(data?.userCount) }}
        </span>
      </div>
    </div>
  </section>
</template>
