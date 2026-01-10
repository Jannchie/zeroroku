<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { label: '总榜', to: '/bilibili/fans' },
  { label: '7日增加', to: '/bilibili/fans/7d-up' },
  { label: '7日减少', to: '/bilibili/fans/7d-down' },
  { label: '1日增加', to: '/bilibili/fans/1d-up' },
  { label: '1日减少', to: '/bilibili/fans/1d-down' },
]

function isActiveRoute(to: string): boolean {
  return route.path === to
}
</script>

<template>
  <div class="flex flex-wrap justify-center border-b border-[var(--auxline-line)] children:border-r first:children:border-l">
    <AuxlineBtn
      v-for="item in navItems"
      :key="item.to"
      size="sm"
      :to="item.to"
      :variant="isActiveRoute(item.to) ? 'contrast' : 'solid'"
      :aria-current="isActiveRoute(item.to) ? 'page' : undefined"
    >
      {{ item.label }}
    </AuxlineBtn>
  </div>
</template>
