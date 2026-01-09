<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  align?: 'left' | 'right'
}>(), {
  align: 'right',
})

const alignClass = computed(() => (props.align === 'left' ? 'left-0' : 'right-0'))
</script>

<template>
  <div class="auxline-menu relative inline-flex group">
    <div class="auxline-menu-trigger inline-flex">
      <slot name="trigger" />
    </div>
    <div
      class="auxline-menu-panel absolute top-full z-10 w-full opacity-0 pointer-events-none transition-opacity duration-150
        group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"
      :class="alignClass"
    >
      <div
        class="auxline-menu-surface w-full border border-[var(--auxline-line)] bg-[var(--auxline-bg-emphasis)] text-[var(--auxline-fg)]"
      >
        <slot />
      </div>
    </div>
  </div>
</template>
