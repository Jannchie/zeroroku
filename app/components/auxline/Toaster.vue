<script setup lang="ts">
import type { ToastTone } from '~/composables/useToast'

const { toasts, dismiss } = useToast()

const toneIcon: Record<ToastTone, string> = {
  default: 'i-heroicons-information-circle',
  success: 'i-heroicons-check-circle',
  error: 'i-heroicons-exclamation-circle',
}
</script>

<template>
  <!-- 低调的卡片：桌面在右下角、手机在底部居中；新的在下面，几秒后自己消失 -->
  <div class="zr-toaster" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="zr-toast">
      <div
        v-for="item in toasts"
        :key="item.id"
        class="zr-toast"
        :class="`zr-toast--${item.tone}`"
        role="status"
      >
        <span class="zr-toast-icon h-4 w-4 shrink-0" :class="toneIcon[item.tone]" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium leading-5">
            {{ item.title }}
          </p>
          <p v-if="item.description" class="mt-0.5 text-[13px] leading-5 text-[var(--auxline-fg-muted)]">
            {{ item.description }}
          </p>
        </div>
        <button
          type="button"
          class="-mr-1 -mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--auxline-fg-muted)] hover:bg-[var(--auxline-bg-hover)] hover:text-[var(--auxline-fg)]"
          aria-label="关闭提示"
          @click="dismiss(item.id)"
        >
          <span class="i-heroicons-x-mark h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style>
.zr-toaster {
  position: fixed;
  z-index: 60;
  right: 16px;
  bottom: 16px;
  left: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
  padding-bottom: env(safe-area-inset-bottom);
}
@media (min-width: 640px) {
  .zr-toaster { left: auto; right: 24px; bottom: 24px; align-items: flex-end; }
}
.zr-toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  max-width: 360px;
  padding: 12px;
  border: 1px solid var(--auxline-line-strong);
  border-radius: 10px;
  background: var(--auxline-bg);
  color: var(--auxline-fg);
  box-shadow: var(--zr-shadow-pop);
  pointer-events: auto;
}
.zr-toast-icon { margin-top: 2px; color: var(--auxline-fg-muted); }
.zr-toast--success .zr-toast-icon { color: var(--zr-success); }
.zr-toast--error .zr-toast-icon { color: var(--zr-danger); }

.zr-toast-enter-active, .zr-toast-leave-active { transition: opacity .2s ease, transform .2s ease; }
.zr-toast-enter-from, .zr-toast-leave-to { opacity: 0; transform: translateY(6px); }
.zr-toast-move { transition: transform .2s ease; }
@media (prefers-reduced-motion: reduce) {
  .zr-toast-enter-active, .zr-toast-leave-active, .zr-toast-move { transition: opacity .2s ease; transform: none; }
}
</style>
