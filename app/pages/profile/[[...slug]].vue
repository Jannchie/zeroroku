<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const slugParam = computed(() => route.params.slug)

const slugParts = computed(() => {
  if (Array.isArray(slugParam.value)) {
    return slugParam.value
  }
  if (typeof slugParam.value === 'string') {
    return [slugParam.value]
  }
  return []
})

const targetPath = computed(() => {
  if (slugParts.value.length === 0) {
    return '/me'
  }
  const encoded = slugParts.value.map(part => encodeURIComponent(part)).join('/')
  return `/me/${encoded}`
})

await navigateTo({ path: targetPath.value, query: route.query }, { replace: true })
</script>

<template>
  <div />
</template>
