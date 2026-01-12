<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const midParam = computed(() => (Array.isArray(route.params.mid) ? route.params.mid[0] : route.params.mid))
const mid = computed(() => (typeof midParam.value === 'string' ? midParam.value : ''))

const targetPath = computed(() => {
  if (!mid.value) {
    return '/bilibili'
  }
  return `/bilibili/author/${encodeURIComponent(mid.value)}`
})

await navigateTo({ path: targetPath.value, query: route.query }, { replace: true })
</script>

<template>
  <div />
</template>
