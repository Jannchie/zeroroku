<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  titleWeight?: 'normal' | 'bold'
  bordered?: boolean
}>(), {
  bordered: true,
  subtitle: undefined,
  titleWeight: 'normal',
})
</script>

<template>
  <!-- 页面标题区：左边标题 + 副标题，右边可放操作；下面紧跟标签栏时不画分隔线（由标签栏画） -->
  <header class="zr-page-head" :class="props.bordered ? 'border-b border-[var(--auxline-line)]' : 'pb-4'">
    <div class="min-w-0">
      <h1 class="zr-page-title" :class="props.titleWeight === 'bold' ? 'font-bold' : ''">
        {{ props.title }}
      </h1>
      <p v-if="props.subtitle" class="zr-page-sub">
        {{ props.subtitle }}
      </p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
