<script setup lang="ts">
import { computed } from 'vue'

type TitleWeight = 'normal' | 'bold'

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  titleWeight?: TitleWeight
}>(), {
  subtitle: undefined,
  titleWeight: 'normal',
})

const wrapperClass = computed(() => {
  return 'text-center w-full py-12 border-b border-[var(--auxline-line)]'
})

const titleClass = computed(() => {
  return [
    'text-3xl',
    props.titleWeight === 'bold' ? 'font-bold' : '',
  ].filter(Boolean).join(' ')
})

const subtitleClass = computed(() => {
  return 'text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)] w-full text-center border-[var(--auxline-line)] mt-2'
})
</script>

<template>
  <header :class="wrapperClass">
    <h1 :class="titleClass">
      {{ title }}
    </h1>
    <p v-if="subtitle" :class="subtitleClass">
      {{ subtitle }}
    </p>
  </header>
</template>
