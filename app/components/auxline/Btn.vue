<script setup lang="ts">
import { computed } from 'vue'

type AuxlineBtnVariant = 'solid' | 'contrast'
type AuxlineBtnSize = 'xs' | 'sm' | 'md' | 'lg'

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

// 低调按钮：默认只有文字，悬停一层浅灰底；选中 / 主要操作（contrast）是浅灰底 + 一圈细内描边，不做黑白反色
const baseClass = 'auxline-btn relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg leading-none transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--auxline-line-strong)] disabled:cursor-not-allowed disabled:opacity-50'

const variantClasses: Record<AuxlineBtnVariant, string> = {
  solid: 'text-[var(--auxline-fg-2)] hover:text-[var(--auxline-fg)] hover:bg-[var(--auxline-bg-hover)]',
  contrast: 'auxline-btn-contrast text-[var(--auxline-fg)] bg-[var(--auxline-bg-emphasis)] hover:bg-[var(--auxline-bg-hover)]',
}

const sizeClasses: Record<AuxlineBtnSize, string> = {
  xs: 'h-6 px-2 text-xs',
  sm: 'h-7 px-2.5 text-[13px]',
  md: 'h-8 px-3.5 text-sm',
  lg: 'h-9 px-4 text-sm',
}

const isDisabled = computed(() => props.disabled || props.loading)

const classList = computed(() => [
  baseClass,
  variantClasses[props.variant],
  sizeClasses[props.size],
  props.loading ? 'auxline-btn-loading' : null,
  props.to && isDisabled.value ? 'pointer-events-none opacity-50' : null,
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
    <span v-if="props.loading" class="auxline-btn-spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

<style>
.auxline-btn-contrast {
  box-shadow: inset 0 0 0 1px var(--auxline-line-strong);
}

/* 加载中：文字变淡，前面一个慢慢转的小圆弧，不闪烁 */
.auxline-btn-loading,
.auxline-btn-loading:disabled {
  opacity: 1;
  color: var(--auxline-fg-muted);
  cursor: progress;
}

.auxline-btn-spinner {
  width: 12px;
  height: 12px;
  flex: none;
  border: 1.5px solid var(--auxline-line-strong);
  border-top-color: var(--auxline-fg-muted);
  border-radius: 50%;
  animation: auxline-btn-spin 0.9s linear infinite;
}

@keyframes auxline-btn-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auxline-btn-spinner {
    animation-duration: 2.4s;
  }
}
</style>
