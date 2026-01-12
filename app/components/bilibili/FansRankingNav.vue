<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  {
    label: '总排行',
    shortLabel: '总榜',
    to: '/bilibili/rank',
    activePaths: ['/bilibili/rank', '/bilibili/rank/fans/desc'],
  },
  { label: '7日涨粉榜', shortLabel: '7日涨', to: '/bilibili/rank/rate7/desc' },
  { label: '1日涨粉榜', shortLabel: '1日涨', to: '/bilibili/rank/rate1/desc' },
  { label: '7日掉粉榜', shortLabel: '7日跌', to: '/bilibili/rank/rate7/asc' },
  { label: '1日掉粉榜', shortLabel: '1日跌', to: '/bilibili/rank/rate1/asc' },
]

function isActiveRoute(item: { to: string, activePaths?: string[] }): boolean {
  if (item.activePaths) {
    return item.activePaths.includes(route.path)
  }
  return route.path === item.to
}
</script>

<template>
  <div class="flex flex-wrap justify-center border-b border-[var(--auxline-line)] children:border-r first:children:border-l w-full">
    <AuxlineBtn
      v-for="item in navItems"
      :key="item.to"
      size="sm"
      :to="item.to"
      :variant="isActiveRoute(item) ? 'contrast' : 'solid'"
      :aria-current="isActiveRoute(item) ? 'page' : undefined"
      :aria-label="item.label"
    >
      <span class="sm:hidden">{{ item.shortLabel }}</span>
      <span class="hidden sm:inline">{{ item.label }}</span>
    </AuxlineBtn>
  </div>
</template>
