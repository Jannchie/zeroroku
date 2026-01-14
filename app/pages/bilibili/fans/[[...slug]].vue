<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const slugParam = computed(() => route.params.slug)

const slug = computed(() => {
  if (Array.isArray(slugParam.value)) {
    return slugParam.value.join('/')
  }
  if (typeof slugParam.value === 'string') {
    return slugParam.value
  }
  return ''
})

const target = computed(() => {
  switch (slug.value) {
    case '': {
      return '/bilibili/rank'
    }
    case '1d-up': {
      return '/bilibili/rank/rate1/desc'
    }
    case '1d-down': {
      return '/bilibili/rank/rate1/asc'
    }
    case '7d-up': {
      return '/bilibili/rank/rate7/desc'
    }
    case '7d-down': {
      return '/bilibili/rank/rate7/asc'
    }
    default: {
      return '/bilibili/rank'
    }
  }
})

await navigateTo({ path: target.value, query: route.query }, { replace: true })
</script>

<template>
  <div />
</template>
