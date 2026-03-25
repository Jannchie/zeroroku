<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { authClient } from '~~/lib/client'
import { buildLoginPath, buildVerificationCallbackUrl, resolveRedirectPath } from '~~/lib/auth-links'

useSeoMeta({
  title: '邮箱验证',
  description: '完成账号邮箱验证，激活邮箱密码登录。',
  ogTitle: '邮箱验证',
  ogDescription: '完成账号邮箱验证，激活邮箱密码登录。',
})

const route = useRoute()
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const isSubmitting = ref(false)

const mode = computed(() => typeof route.query.mode === 'string' ? route.query.mode : null)
const redirectTarget = computed(() => resolveRedirectPath(route.query.next))
const routeError = computed(() => typeof route.query.error === 'string' ? route.query.error : null)
const isCompleteMode = computed(() => mode.value === 'complete')
const loginPath = computed(() => buildLoginPath(redirectTarget.value, !routeError.value && isCompleteMode.value))

const pageTitle = computed(() => {
  if (isCompleteMode.value) {
    return routeError.value ? '验证链接不可用' : '邮箱已验证'
  }
  return '检查你的邮箱'
})

const pageSubtitle = computed(() => {
  if (isCompleteMode.value) {
    return routeError.value ? '验证链接可能已失效，请重新发送' : '邮箱验证已经完成，现在可以登录'
  }
  return '我们已经向你的邮箱发送了一封验证邮件'
})

const statusMessage = computed(() => {
  if (isCompleteMode.value) {
    if (routeError.value === 'invalid_token' || routeError.value === 'INVALID_TOKEN') {
      return '验证链接无效或已过期，请重新发送验证邮件。'
    }
    if (routeError.value) {
      return '验证链接不可用，请重新发送验证邮件。'
    }
    return '邮箱验证成功，请返回登录页继续。'
  }

  if (email.value) {
    return `验证邮件已发送到 ${email.value}，请打开邮件中的链接完成验证。`
  }
  return '请输入注册邮箱，我们会重新发送验证邮件。'
})

const canSubmit = computed(() => {
  return Boolean(email.value.trim()) && !isSubmitting.value
})

function onEmailInput(): void {
  errorMessage.value = null
  successMessage.value = null
}

async function resendVerificationEmail(): Promise<void> {
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
    const { error } = await authClient.sendVerificationEmail({
      email: normalizedEmail,
      callbackURL: buildVerificationCallbackUrl(redirectTarget.value),
    })

    if (error) {
      errorMessage.value = error.message ?? '发送验证邮件失败。'
      return
    }

    successMessage.value = '验证邮件已重新发送，请检查你的邮箱。'
    email.value = normalizedEmail
  }
  catch (error) {
    if (error && typeof error === 'object' && 'message' in error) {
      errorMessage.value = String(error.message) || '发送验证邮件失败。'
      return
    }
    errorMessage.value = '发送验证邮件失败。'
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="flex flex-col items-center gap-4">
    <AuxlinePageHeader :title="pageTitle" :subtitle="pageSubtitle" />
    <div class="w-full max-w-sm flex flex-col gap-3">
      <p :class="isCompleteMode && !routeError ? 'text-xs text-green-600' : 'text-xs text-[var(--auxline-fg-muted)]'">
        {{ statusMessage }}
      </p>

      <template v-if="!isCompleteMode || routeError">
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
          type="button"
          variant="contrast"
          :loading="isSubmitting"
          :disabled="!canSubmit"
          @click="resendVerificationEmail"
        >
          重新发送验证邮件
        </AuxlineBtn>
      </template>

      <p v-if="errorMessage" class="text-xs text-red-600">
        {{ errorMessage }}
      </p>
      <p v-else-if="successMessage" class="text-xs text-green-600">
        {{ successMessage }}
      </p>

      <NuxtLink
        :to="loginPath"
        class="text-xs text-[var(--auxline-fg-muted)] underline underline-offset-2"
      >
        返回登录
      </NuxtLink>
      <NuxtLink
        to="/register"
        class="text-xs text-[var(--auxline-fg-muted)] underline underline-offset-2"
      >
        返回注册
      </NuxtLink>
    </div>
  </section>
</template>
