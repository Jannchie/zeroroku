<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authClient } from '~~/lib/client'
import { buildVerificationCallbackUrl, buildVerifyEmailPath, resolveRedirectPath } from '~~/lib/auth-links'

useSeoMeta({
  title: '注册',
  description: '创建 ZeroRoku 账号并完成邮箱验证。',
  ogTitle: '注册',
  ogDescription: '创建 ZeroRoku 账号并完成邮箱验证。',
})

const route = useRoute()
const router = useRouter()
const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref<string | null>(null)
const isSubmitting = ref(false)

const redirectTarget = computed(() => resolveRedirectPath(route.query.redirect))
const canSubmit = computed(() => {
  return Boolean(
    name.value.trim()
    && email.value.trim()
    && password.value
    && confirmPassword.value
    && !isSubmitting.value,
  )
})

function clearFeedback(): void {
  errorMessage.value = null
}

async function register(): Promise<void> {
  if (isSubmitting.value) {
    return
  }

  errorMessage.value = null

  const trimmedName = name.value.trim()
  const normalizedEmail = email.value.trim().toLowerCase()

  if (!trimmedName) {
    errorMessage.value = '请输入用户名。'
    return
  }
  if (trimmedName.length < 2 || trimmedName.length > 32) {
    errorMessage.value = '用户名长度需在 2-32 个字符之间。'
    return
  }
  if (!normalizedEmail) {
    errorMessage.value = '请输入邮箱。'
    return
  }
  if (!password.value) {
    errorMessage.value = '请输入密码。'
    return
  }
  if (password.value.length < 8) {
    errorMessage.value = '密码至少需要 8 位。'
    return
  }
  if (password.value !== confirmPassword.value) {
    errorMessage.value = '两次输入的密码不一致。'
    return
  }

  isSubmitting.value = true

  try {
    const { error } = await authClient.signUp.email({
      name: trimmedName,
      email: normalizedEmail,
      password: password.value,
      callbackURL: buildVerificationCallbackUrl(redirectTarget.value),
    })

    if (error) {
      errorMessage.value = error.message ?? '注册失败。'
      return
    }

    await router.replace(buildVerifyEmailPath(normalizedEmail, redirectTarget.value))
  }
  catch (error) {
    if (error && typeof error === 'object' && 'message' in error) {
      errorMessage.value = String(error.message) || '注册失败。'
      return
    }
    errorMessage.value = '注册失败。'
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="flex flex-col items-center gap-4">
    <AuxlinePageHeader title="注册" subtitle="创建账号后需要先验证邮箱" />
    <form
      class="w-full max-w-sm flex flex-col gap-3"
      @submit.prevent="register"
    >
      <label class="flex flex-col gap-1 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
        用户名
        <input
          v-model="name"
          type="text"
          autocomplete="username"
          class="h-9 px-3 border border-[var(--auxline-line)] bg-[var(--auxline-bg-emphasis)]
            text-sm text-[var(--auxline-fg)] focus-visible:outline focus-visible:outline-1
            focus-visible:outline-[var(--auxline-line)]"
          @input="clearFeedback"
        >
      </label>
      <label class="flex flex-col gap-1 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
        邮箱
        <input
          v-model="email"
          type="email"
          autocomplete="email"
          class="h-9 px-3 border border-[var(--auxline-line)] bg-[var(--auxline-bg-emphasis)]
            text-sm text-[var(--auxline-fg)] focus-visible:outline focus-visible:outline-1
            focus-visible:outline-[var(--auxline-line)]"
          @input="clearFeedback"
        >
      </label>
      <label class="flex flex-col gap-1 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
        密码
        <input
          v-model="password"
          type="password"
          autocomplete="new-password"
          class="h-9 px-3 border border-[var(--auxline-line)] bg-[var(--auxline-bg-emphasis)]
            text-sm text-[var(--auxline-fg)] focus-visible:outline focus-visible:outline-1
            focus-visible:outline-[var(--auxline-line)]"
          @input="clearFeedback"
        >
      </label>
      <label class="flex flex-col gap-1 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
        确认密码
        <input
          v-model="confirmPassword"
          type="password"
          autocomplete="new-password"
          class="h-9 px-3 border border-[var(--auxline-line)] bg-[var(--auxline-bg-emphasis)]
            text-sm text-[var(--auxline-fg)] focus-visible:outline focus-visible:outline-1
            focus-visible:outline-[var(--auxline-line)]"
          @input="clearFeedback"
        >
      </label>
      <AuxlineBtn
        type="submit"
        variant="contrast"
        :loading="isSubmitting"
        :disabled="!canSubmit"
      >
        创建账号
      </AuxlineBtn>
      <p v-if="errorMessage" class="text-xs text-red-600">
        {{ errorMessage }}
      </p>
      <NuxtLink
        :to="`/login?redirect=${encodeURIComponent(redirectTarget)}`"
        class="text-xs text-[var(--auxline-fg-muted)] underline underline-offset-2"
      >
        已有账号？去登录
      </NuxtLink>
    </form>
  </section>
</template>
