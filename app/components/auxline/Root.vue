<script setup lang="ts">
const props = defineProps<{
  lineColor?: string
}>()
</script>

<template>
  <!-- 线框版式（参考 icons.jannchie.com）：内容收在居中的容器里，左右两条竖线贯穿整页；页头 sticky、半透明模糊 -->
  <div
    class="auxline-root min-h-screen bg-[var(--auxline-bg)] text-[var(--auxline-fg)]"
    :style="props.lineColor ? { '--auxline-line': props.lineColor } : undefined"
  >
    <div class="auxline-shell mx-auto flex min-h-screen max-w-[1680px] flex-col border-x-0 border-[var(--auxline-line)] bg-[var(--auxline-bg)] sm:border-x">
      <header
        v-if="$slots.header || $slots.headerActions || $slots.subheader"
        class="auxline-header sticky top-0 z-30 border-b border-[var(--auxline-line)]"
      >
        <div class="auxline-header-row flex h-[var(--zr-header-h)] items-stretch">
          <div v-if="$slots.header" class="auxline-header-main flex min-w-0 items-stretch">
            <slot name="header" />
          </div>
          <div v-if="$slots.headerActions" class="auxline-header-actions ml-auto flex shrink-0 items-center gap-1 px-3">
            <slot name="headerActions" />
          </div>
        </div>
        <div v-if="$slots.subheader" class="auxline-subheader border-t border-[var(--auxline-line)]">
          <slot name="subheader" />
        </div>
      </header>

      <div class="auxline-body flex min-h-0 flex-1 flex-col">
        <nav v-if="$slots.nav" class="auxline-nav">
          <slot name="nav" />
        </nav>

        <main
          v-if="$slots.main || $slots.default"
          class="auxline-main text-autopsace flex min-h-0 w-full flex-1 flex-col"
        >
          <slot name="main">
            <slot />
          </slot>
        </main>

        <aside v-if="$slots.aside" class="auxline-aside">
          <slot name="aside" />
        </aside>
      </div>

      <footer
        v-if="$slots.footer || $slots.footerMeta"
        class="auxline-footer border-t border-[var(--auxline-line)]"
      >
        <div v-if="$slots.footer" class="auxline-footer-main">
          <slot name="footer" />
        </div>
        <div v-if="$slots.footerMeta" class="auxline-footer-meta">
          <slot name="footerMeta" />
        </div>
      </footer>
    </div>
  </div>
</template>

<style>
/* 页头半透明 + 模糊，内容从下面滚过 */
.auxline-header {
  background: color-mix(in srgb, var(--auxline-bg) 85%, transparent);
  backdrop-filter: blur(14px) saturate(1.4);
}
</style>
