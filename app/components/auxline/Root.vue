<script setup lang="ts">
const props = defineProps<{
  lineColor?: string
}>()

const contentShellClass
  = 'w-full mx-auto sm:max-w-5xl sm:w-[calc(100%-2rem)] border-x-0 sm:border-x border-[var(--auxline-line)]'
</script>

<template>
  <div
    class="auxline-root min-h-screen flex flex-col bg-[var(--auxline-bg)] text-[var(--auxline-fg)]
      [--auxline-bg:#f8f8f8] dark:[--auxline-bg:#111111]
      [--auxline-bg-emphasis:#f1f1f1] dark:[--auxline-bg-emphasis:#171717]
      [--auxline-bg-hover:#e6e6e6] dark:[--auxline-bg-hover:#242424]
      [--auxline-bg-contrast:var(--auxline-fg)]
      [--auxline-fg:#111111] dark:[--auxline-fg:#f2f2f2]
      [--auxline-fg-muted:#0a0a0a] dark:[--auxline-fg-muted:#d6d6d6]
      [--auxline-fg-contrast:var(--auxline-bg)]
      [--auxline-line:var(--auxline-bg-hover)]"
    :style="props.lineColor ? { '--auxline-line': props.lineColor, '--auxline-bg-hover': props.lineColor } : undefined"
  >
    <header
      v-if="$slots.header || $slots.headerActions || $slots.subheader"
      class="auxline-header border-b border-[var(--auxline-line)]"
    >
      <div :class="contentShellClass">
        <div class="auxline-header-row flex items-center gap-4">
          <div v-if="$slots.header" class="auxline-header-main children:border-r children:border-[var(--auxline-line)]">
            <slot name="header" />
          </div>
          <div v-if="$slots.headerActions" class="auxline-header-actions ml-auto flex items-center justify-end children:border-l children:border-[var(--auxline-line)]">
            <slot name="headerActions" />
          </div>
        </div>
        <div v-if="$slots.subheader" class="auxline-subheader">
          <slot name="subheader" />
        </div>
      </div>
    </header>

    <div class="auxline-body flex-1 flex flex-col min-h-0">
      <nav v-if="$slots.nav" class="auxline-nav">
        <slot name="nav" />
      </nav>

      <main
        v-if="$slots.main || $slots.default"
        class="auxline-main flex flex-col children:border-b children:border-[var(--auxline-line)] flex-1 min-h-0" :class="[contentShellClass]"
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
      <div :class="contentShellClass">
        <div v-if="$slots.footer" class="auxline-footer-main">
          <slot name="footer" />
        </div>
        <div v-if="$slots.footerMeta" class="auxline-footer-meta">
          <slot name="footerMeta" />
        </div>
      </div>
    </footer>
  </div>
</template>
