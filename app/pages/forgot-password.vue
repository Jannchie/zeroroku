<script setup lang="ts">
import { computed, ref } from 'vue'
import { authClient } from '~~/lib/client'

useSeoMeta({
  title: '找回密码',
  description: '通过邮箱接收重置密码链接。',
  ogTitle: '找回密码',
  ogDescription: '通过邮箱接收重置密码链接。',
})

const email = ref('')
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const isSubmitting = ref(false)

const canSubmit = computed(() => {
  return Boolean(email.value.trim()) && !isSubmitting.value
})

function buildRedirectTo(): string {
  const origin = globalThis.window?.location.origin
  if (!origin) {
    return '/reset-password'
  }
  return new URL('/reset-password', origin).toString()
}

function onEmailInput(): void {
  errorMessage.value = null
  successMessage.value = null
}

async function requestPasswordReset(): Promise<void> {
  if (isSubmitting.value) {
    return
  }

  errorMessage.value = null
  successMessage.value = null

  const normalizedEmail = email.value.trim().toLowerCase()
  if (!normalizedEmail) {
    errorMessage.value = '请输入邮箱。'
    return
  }

  isSubmitting.value = true

  try {
    const { error } = await authClient.requestPasswordReset({
      email: normalizedEmail,
      redirectTo: buildRedirectTo(),
    })

    if (error) {
      errorMessage.value = error.message ?? '发送重置邮件失败。'
      return
    }

    successMessage.value = '如果该邮箱已注册，我们已经发送了重置链接。'
  }
  catch (error) {
    if (error && typeof error === 'object' && 'message' in error) {
      errorMessage.value = String(error.message) || '发送重置邮件失败。'
      return
    }
    errorMessage.value = '发送重置邮件失败。'
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="flex flex-col items-center gap-4">
    <AuxlinePageHeader title="找回密码" variant="plain" />
    <form
      class="w-full max-w-sm flex flex-col gap-3"
      @submit.prevent="requestPasswordReset"
    >
      <p class="text-xs text-[var(--auxline-fg-muted)]">
        输入登录邮箱，我们会向该邮箱发送一封重置密码邮件。
      </p>
      <label class="flex flex-col gap-1 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
        邮箱
        <input
          v-model="email"
          type="email"
          autocomplete="email"
          class="h-9 px-3 border border-[var(--auxline-line)] bg-[var(--auxline-bg-emphasis)]
            text-sm text-[var(--auxline-fg)] focus-visible:outline focus-visible:outline-1
            focus-visible:outline-[var(--auxline-line)]"
          @input="onEmailInput"
        >
      </label>
      <AuxlineBtn
        type="submit"
        variant="contrast"
        :loading="isSubmitting"
        :disabled="!canSubmit"
      >
        发送重置邮件
      </AuxlineBtn>
      <p v-if="errorMessage" class="text-xs text-red-600">
        {{ errorMessage }}
      </p>
      <p v-else-if="successMessage" class="text-xs text-green-600">
        {{ successMessage }}
      </p>
      <NuxtLink
        to="/login"
        class="text-xs text-[var(--auxline-fg-muted)] underline underline-offset-2"
      >
        返回登录
      </NuxtLink>
    </form>
  </section>
</template>
