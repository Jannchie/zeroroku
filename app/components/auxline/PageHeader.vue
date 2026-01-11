<script setup lang="ts">
import { computed } from 'vue'

type HeaderVariant = 'section' | 'underline' | 'plain'
type TitleWeight = 'normal' | 'bold'

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  variant?: HeaderVariant
  titleWeight?: TitleWeight
}>(), {
  subtitle: undefined,
  variant: 'section',
  titleWeight: 'normal',
})

const wrapperClass = computed(() => {
  if (props.variant === 'underline') {
    return 'text-center w-full'
  }
  if (props.variant === 'plain') {
    return 'text-center space-y-2'
  }
  return 'text-center space-y-2 border-b w-full pb-12 border-[var(--auxline-line)]'
})

const titleClass = computed(() => {
  return [
    'text-3xl',
    props.titleWeight === 'bold' ? 'font-bold' : '',
  ].filter(Boolean).join(' ')
})

const subtitleClass = computed(() => {
  if (props.variant === 'underline') {
    return 'text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)] w-full border-b text-center border-[var(--auxline-line)] pb-2 mt-2'
  }
  return 'text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]'
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
