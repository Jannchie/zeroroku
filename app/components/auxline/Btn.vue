<script setup lang="ts">
import { computed } from 'vue'

type AuxlineBtnVariant = 'solid' | 'contrast'
type AuxlineBtnSize = 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{
  variant?: AuxlineBtnVariant
  size?: AuxlineBtnSize
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  to?: string
}>(), {
  variant: 'solid',
  size: 'md',
  type: 'button',
  disabled: false,
  loading: false,
  to: undefined,
})

const baseClass = 'auxline-btn inline-flex items-center justify-center gap-2 whitespace-nowrap border-[var(--auxline-line)] font-mono uppercase tracking-[0.12em] text-[0.75rem] leading-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--auxline-line)] disabled:cursor-not-allowed disabled:opacity-60'

const variantClasses: Record<AuxlineBtnVariant, string> = {
  solid: 'text-[var(--auxline-fg)] hover:bg-[var(--auxline-bg-hover)]',
  contrast: 'bg-[var(--auxline-bg-contrast)] text-[var(--auxline-fg-contrast)] hover:bg-[var(--auxline-fg-muted)]',
}

const sizeClasses: Record<AuxlineBtnSize, string> = {
  sm: 'h-8 px-3',
  md: 'h-9 px-4',
  lg: 'h-10 px-5',
}

const isDisabled = computed(() => props.disabled || props.loading)

const classList = computed(() => [
  baseClass,
  variantClasses[props.variant],
  sizeClasses[props.size],
  props.loading ? 'auxline-btn-loading' : null,
  props.to && isDisabled.value ? 'pointer-events-none opacity-60' : null,
])
</script>

<template>
  <NuxtLink
    v-if="props.to"
    :to="props.to"
    :aria-busy="props.loading ? 'true' : undefined"
    :aria-disabled="isDisabled ? 'true' : undefined"
    :tabindex="isDisabled ? -1 : undefined"
    :class="classList"
  >
    <slot />
  </NuxtLink>
  <button
    v-else
    :type="props.type"
    :disabled="isDisabled"
    :aria-busy="props.loading ? 'true' : undefined"
    :class="classList"
  >
    <slot />
  </button>
</template>

<style>
@keyframes auxline-btn-flash {
  0%,
  49% {
    background-color: var(--auxline-bg-contrast);
    color: var(--auxline-fg-contrast);
  }
  50%,
  100% {
    background-color: var(--auxline-bg-emphasis);
    color: var(--auxline-fg);
  }
}

.auxline-btn-loading {
  background-color: var(--auxline-bg-contrast);
  color: var(--auxline-fg-contrast);
  animation: auxline-btn-flash 0.1s steps(1, end) infinite;
  opacity: 1;
  cursor: progress;
}

.auxline-btn-loading:disabled {
  opacity: 1;
  cursor: progress;
}

@media (prefers-reduced-motion: reduce) {
  .auxline-btn-loading {
    animation: none;
  }
}
</style>
