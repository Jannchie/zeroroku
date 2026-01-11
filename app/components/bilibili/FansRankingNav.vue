<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { label: '总排行', shortLabel: '总榜', to: '/bilibili/fans' },
  { label: '7日涨粉榜', shortLabel: '7日涨', to: '/bilibili/fans/7d-up' },
  { label: '1日涨粉榜', shortLabel: '1日涨', to: '/bilibili/fans/1d-up' },
  { label: '7日掉粉榜', shortLabel: '7日跌', to: '/bilibili/fans/7d-down' },
  { label: '1日掉粉榜', shortLabel: '1日跌', to: '/bilibili/fans/1d-down' },
]

function isActiveRoute(to: string): boolean {
  return route.path === to
}
</script>

<template>
  <div class="flex flex-wrap justify-center border-b border-[var(--auxline-line)] children:border-r first:children:border-l w-full">
    <AuxlineBtn
      v-for="item in navItems"
      :key="item.to"
      size="sm"
      :to="item.to"
      :variant="isActiveRoute(item.to) ? 'contrast' : 'solid'"
      :aria-current="isActiveRoute(item.to) ? 'page' : undefined"
      :aria-label="item.label"
    >
      <span class="sm:hidden">{{ item.shortLabel }}</span>
      <span class="hidden sm:inline">{{ item.label }}</span>
    </AuxlineBtn>
  </div>
</template>
