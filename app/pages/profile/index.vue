<script setup lang="ts">
import { computed } from 'vue'
import { authClient } from '~~/lib/client'

useSeoMeta({
  title: '个人资料',
})

const session = authClient.useSession()
const user = computed(() => session.value?.data?.user ?? null)

const numberFormatter = new Intl.NumberFormat('zh-CN')
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

function formatNumber(value: number | string | null | undefined): string {
  if (typeof value === 'number') {
    return numberFormatter.format(Number.isFinite(value) ? value : 0)
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isNaN(parsed) ? '0' : numberFormatter.format(parsed)
  }
  return '0'
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) {
    return '--'
  }
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) {
    return '--'
  }
  return dateFormatter.format(date)
}
</script>

<template>
  <div v-if="user">
    <div class="grid grid-cols-1 sm:grid-cols-2">
      <div
        class="flex items-center justify-between px-4 py-3 text-xs font-mono uppercase tracking-[0.12em]
          text-[var(--auxline-fg-muted)] border-b border-[var(--auxline-line)] sm:border-b-0 sm:border-r"
      >
        <span>经验</span>
        <span class="text-sm font-mono text-[var(--auxline-fg)]">
          {{ formatNumber(user.exp) }}
        </span>
      </div>
      <div
        class="flex items-center justify-between px-4 py-3 text-xs font-mono uppercase tracking-[0.12em]
          text-[var(--auxline-fg-muted)]"
      >
        <span>积分</span>
        <span class="text-sm font-mono text-[var(--auxline-fg)]">
          {{ formatNumber(user.credit) }}
        </span>
      </div>
    </div>

    <div class="border-t border-[var(--auxline-line)]">
      <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--auxline-line)]">
        <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
          邮箱验证
        </span>
        <span class="text-sm font-mono text-[var(--auxline-fg)]">
          {{ user.emailVerified ? '已验证' : '未验证' }}
        </span>
      </div>
      <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--auxline-line)]">
        <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
          注册时间
        </span>
        <span class="text-sm font-mono text-[var(--auxline-fg)]">
          {{ formatDate(user.createdAt) }}
        </span>
      </div>
      <div class="flex items-center justify-between px-4 py-3">
        <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
          最近更新
        </span>
        <span class="text-sm font-mono text-[var(--auxline-fg)]">
          {{ formatDate(user.updatedAt) }}
        </span>
      </div>
    </div>
  </div>
</template>
