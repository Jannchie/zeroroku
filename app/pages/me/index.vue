<script setup lang="ts">
import { computed, ref } from 'vue'
import { authClient } from '~~/lib/client'
import { buildVerificationCallbackUrl } from '~~/lib/auth-links'
import { formatDateTime } from '~~/lib/formatDateTime'

useSeoMeta({
  title: '个人资料',
  description: '查看并管理你的账户基础信息、经验与积分概览。',
  ogTitle: '个人资料',
  ogDescription: '查看并管理你的账户基础信息、经验与积分概览。',
})

const session = authClient.useSession()
const user = computed(() => session.value?.data?.user ?? null)
const resendError = ref<string | null>(null)
const resendSuccess = ref<string | null>(null)
const isSendingVerification = ref(false)

const numberFormatter = new Intl.NumberFormat('zh-CN')

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
  return formatDateTime(value, { fallback: '--', useRawOnInvalid: false })
}

async function resendVerificationEmail(): Promise<void> {
  if (!user.value || isSendingVerification.value) {
    return
  }

  resendError.value = null
  resendSuccess.value = null
  isSendingVerification.value = true

  try {
    const { error } = await authClient.sendVerificationEmail({
      email: user.value.email,
      callbackURL: buildVerificationCallbackUrl('/me'),
    })

    if (error) {
      resendError.value = error.message ?? '发送验证邮件失败。'
      return
    }

    resendSuccess.value = '验证邮件已发送，请检查你的邮箱。'
  }
  catch (error) {
    if (error && typeof error === 'object' && 'message' in error) {
      resendError.value = String(error.message) || '发送验证邮件失败。'
      return
    }
    resendError.value = '发送验证邮件失败。'
  }
  finally {
    isSendingVerification.value = false
  }
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
        <div class="flex items-center gap-3">
          <span class="text-sm font-mono text-[var(--auxline-fg)]">
            {{ user.emailVerified ? '已验证' : '未验证' }}
          </span>
          <AuxlineBtn
            v-if="!user.emailVerified"
            type="button"
            size="xs"
            :loading="isSendingVerification"
            @click="resendVerificationEmail"
          >
            重新发送
          </AuxlineBtn>
        </div>
      </div>
      <div v-if="resendError || resendSuccess" class="px-4 py-2 border-b border-[var(--auxline-line)]">
        <p v-if="resendError" class="text-xs text-red-600">
          {{ resendError }}
        </p>
        <p v-else class="text-xs text-green-600">
          {{ resendSuccess }}
        </p>
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
