<script setup lang="ts">
type AuxlineBtnVariant = 'solid' | 'contrast'
type AuxlineBtnSize = 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{
  variant?: AuxlineBtnVariant
  size?: AuxlineBtnSize
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}>(), {
  variant: 'solid',
  size: 'md',
  type: 'button',
  disabled: false,
})

const baseClass = 'auxline-btn inline-flex items-center justify-center gap-2 whitespace-nowrap border-[var(--auxline-line)] font-mono uppercase tracking-[0.12em] text-[0.75rem] leading-none transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--auxline-line)] disabled:cursor-not-allowed disabled:opacity-60'

const variantClasses: Record<AuxlineBtnVariant, string> = {
  solid: 'bg-[var(--auxline-bg-emphasis)] text-[var(--auxline-fg)] hover:bg-[var(--auxline-bg-hover)]',
  contrast: 'bg-[var(--auxline-bg-contrast)] text-[var(--auxline-fg-contrast)] hover:bg-[var(--auxline-fg-muted)]',
}

const sizeClasses: Record<AuxlineBtnSize, string> = {
  sm: 'h-8 px-3',
  md: 'h-9 px-4',
  lg: 'h-10 px-5',
}
</script>

<template>
  <button
    :type="props.type"
    :disabled="props.disabled"
    :class="[baseClass, variantClasses[props.variant], sizeClasses[props.size]]"
  >
    <slot />
  </button>
</template>
