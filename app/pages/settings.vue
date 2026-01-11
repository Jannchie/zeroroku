<script setup lang="ts">
import { computed } from 'vue'

const { selectedScheme, activeScheme, setScheme } = useColorScheme()

const activeSchemeLabel = computed(() => (activeScheme.value === 'dark' ? '夜间' : '日间'))
</script>

<template>
  <section class="flex flex-col items-center">
    <AuxlinePageHeader
      title="设置"
      subtitle="外观与显示"
    />

    <div class="w-full max-w-xl border-[var(--auxline-line)]">
      <div class="flex flex-col gap-4 px-4 py-6 border-x border-[var(--auxline-line)]">
        <div class="flex flex-col gap-2">
          <p class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
            主题模式
          </p>
          <div class="flex flex-wrap items-center" role="group" aria-label="主题模式切换">
            <AuxlineBtn
              size="sm"
              :variant="selectedScheme === 'auto' ? 'contrast' : 'solid'"
              :aria-pressed="selectedScheme === 'auto'"
              @click="setScheme('auto')"
            >
              跟随系统
            </AuxlineBtn>
            <AuxlineBtn
              size="sm"
              :variant="selectedScheme === 'light' ? 'contrast' : 'solid'"
              :aria-pressed="selectedScheme === 'light'"
              @click="setScheme('light')"
            >
              日间
            </AuxlineBtn>
            <AuxlineBtn
              size="sm"
              :variant="selectedScheme === 'dark' ? 'contrast' : 'solid'"
              :aria-pressed="selectedScheme === 'dark'"
              @click="setScheme('dark')"
            >
              夜间
            </AuxlineBtn>
          </div>
          <p class="text-xs text-[var(--auxline-fg-muted)]">
            <span v-if="selectedScheme === 'auto'">当前系统为 {{ activeSchemeLabel }}。</span>
            <span v-else>切换后立即生效，并记住你的选择。</span>
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
