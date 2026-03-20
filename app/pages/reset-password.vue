<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authClient } from '~~/lib/client'

useSeoMeta({
  title: '重置密码',
  description: '使用邮件中的链接设置新的登录密码。',
  ogTitle: '重置密码',
  ogDescription: '使用邮件中的链接设置新的登录密码。',
})

const route = useRoute()
const router = useRouter()
const newPassword = ref('')
const confirmPassword = ref('')
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const isSubmitting = ref(false)

const token = computed(() => {
  const value = route.query.token
  return typeof value === 'string' && value ? value : null
})

const routeError = computed(() => {
  const value = route.query.error
  return typeof value === 'string' && value ? value : null
})

const tokenErrorMessage = computed(() => {
  if (routeError.value === 'INVALID_TOKEN') {
    return '重置链接无效或已过期，请重新申请。'
  }
  if (routeError.value) {
    return '重置链接不可用，请重新申请。'
  }
  if (!token.value) {
    return '缺少重置令牌，请重新申请。'
  }
  return null
})

const canSubmit = computed(() => {
  if (tokenErrorMessage.value) {
    return false
  }
  if (!newPassword.value || !confirmPassword.value) {
    return false
  }
  return !isSubmitting.value
})

watch(tokenErrorMessage, (value) => {
  errorMessage.value = value
  successMessage.value = null
}, { immediate: true })

function onPasswordInput(): void {
  successMessage.value = null
  errorMessage.value = tokenErrorMessage.value
}

async function submitResetPassword(): Promise<void> {
  if (isSubmitting.value) {
    return
  }

  errorMessage.value = tokenErrorMessage.value
  successMessage.value = null

  if (!token.value) {
    return
  }
  if (!newPassword.value) {
    errorMessage.value = '请输入新密码。'
    return
  }
  if (newPassword.value.length < 8) {
    errorMessage.value = '新密码至少需要 8 位。'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = '两次输入的新密码不一致。'
    return
  }

  isSubmitting.value = true

  try {
    const { error } = await authClient.resetPassword({
      newPassword: newPassword.value,
      token: token.value,
    })

    if (error) {
      errorMessage.value = error.message ?? '重置密码失败。'
      return
    }

    newPassword.value = ''
    confirmPassword.value = ''
    successMessage.value = '密码已重置，请使用新密码登录。'
    await router.replace('/login?reset=success')
  }
  catch (error) {
    if (error && typeof error === 'object' && 'message' in error) {
      errorMessage.value = String(error.message) || '重置密码失败。'
      return
    }
    errorMessage.value = '重置密码失败。'
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="flex flex-col items-center gap-4">
    <AuxlinePageHeader title="重置密码" variant="plain" />
    <form
      class="w-full max-w-sm flex flex-col gap-3"
      @submit.prevent="submitResetPassword"
    >
      <p class="text-xs text-[var(--auxline-fg-muted)]">
        请输入新的登录密码。重置后其他会话会自动失效。
      </p>
      <label class="flex flex-col gap-1 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
        新密码
        <input
          v-model="newPassword"
          type="password"
          autocomplete="new-password"
          :disabled="Boolean(tokenErrorMessage) || isSubmitting"
          class="h-9 px-3 border border-[var(--auxline-line)] bg-[var(--auxline-bg-emphasis)]
            text-sm text-[var(--auxline-fg)] focus-visible:outline focus-visible:outline-1
            focus-visible:outline-[var(--auxline-line)]"
          @input="onPasswordInput"
        >
      </label>
      <label class="flex flex-col gap-1 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
        确认新密码
        <input
          v-model="confirmPassword"
          type="password"
          autocomplete="new-password"
          :disabled="Boolean(tokenErrorMessage) || isSubmitting"
          class="h-9 px-3 border border-[var(--auxline-line)] bg-[var(--auxline-bg-emphasis)]
            text-sm text-[var(--auxline-fg)] focus-visible:outline focus-visible:outline-1
            focus-visible:outline-[var(--auxline-line)]"
          @input="onPasswordInput"
        >
      </label>
      <AuxlineBtn
        type="submit"
        variant="contrast"
        :loading="isSubmitting"
        :disabled="!canSubmit"
      >
        重置密码
      </AuxlineBtn>
      <p v-if="errorMessage" class="text-xs text-red-600">
        {{ errorMessage }}
      </p>
      <p v-else-if="successMessage" class="text-xs text-green-600">
        {{ successMessage }}
      </p>
      <NuxtLink
        to="/forgot-password"
        class="text-xs text-[var(--auxline-fg-muted)] underline underline-offset-2"
      >
        重新发送邮件
      </NuxtLink>
    </form>
  </section>
</template>
