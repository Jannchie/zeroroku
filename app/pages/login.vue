<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authClient } from '~~/lib/client'
import { buildVerificationCallbackUrl, buildVerifyEmailPath, resolveRedirectPath } from '~~/lib/auth-links'

const email = ref('')
const password = ref('')
const credentialError = ref<string | null>(null)
const socialError = ref<string | null>(null)
const isCredentialSigningIn = ref(false)
const isSocialSigningIn = ref(false)
const route = useRoute()
const router = useRouter()
const resetSuccessMessage = computed(() => {
  return route.query.reset === 'success' ? '密码已重置，请使用新密码登录。' : null
})
const verifiedSuccessMessage = computed(() => {
  return route.query.verified === 'success' ? '邮箱已验证，现在可以登录了。' : null
})
const redirectTarget = computed(() => {
  return resolveRedirectPath(route.query.redirect ?? route.query.next)
})

useSeoMeta({
  title: '登录',
})

interface RequestErrorPayload {
  statusMessage?: string
  message?: string
  data?: {
    email?: string
  }
}

function readErrorPayload(error: unknown): RequestErrorPayload | null {
  if (!error || typeof error !== 'object' || !('data' in error)) {
    return null
  }
  const payload = error.data
  return payload && typeof payload === 'object' ? payload as RequestErrorPayload : null
}

function readErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') {
    return null
  }
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode
  }
  if ('status' in error && typeof error.status === 'number') {
    return error.status
  }
  return null
}

async function signInWithGithub() {
  socialError.value = null
  isSocialSigningIn.value = true

  try {
    const baseOrigin = globalThis.window === undefined ? '' : globalThis.location.origin
    const callbackURL = baseOrigin
      ? new URL(redirectTarget.value, baseOrigin).toString()
      : redirectTarget.value
    const { data, error } = await authClient.signIn.social({
      provider: 'github',
      callbackURL,
    })

    if (error) {
      socialError.value = error.message ?? '登录失败。'
      return
    }

    if (data?.url && globalThis.window !== undefined) {
      globalThis.location.href = data.url
    }
  }
  finally {
    isSocialSigningIn.value = false
  }
}

async function signInWithPassword() {
  if (isCredentialSigningIn.value) {
    return
  }
  credentialError.value = null
  isCredentialSigningIn.value = true

  try {
    const trimmedEmail = email.value.trim().toLowerCase()
    if (!trimmedEmail) {
      credentialError.value = '请输入邮箱。'
      return
    }
    if (!password.value) {
      credentialError.value = '请输入密码。'
      return
    }

    const verificationCallbackURL = buildVerificationCallbackUrl(redirectTarget.value)
    await $fetch('/api/auth/sign-in/email', {
      method: 'POST',
      body: {
        email: trimmedEmail,
        password: password.value,
        callbackURL: verificationCallbackURL,
      },
    })
    await router.replace(redirectTarget.value)
  }
  catch (error) {
    const statusCode = readErrorStatus(error)
    const payload = readErrorPayload(error)
    const maybeEmail = payload?.data?.email

    if (statusCode === 403 && maybeEmail) {
      await router.replace(buildVerifyEmailPath(maybeEmail, redirectTarget.value))
      return
    }

    if (payload) {
      credentialError.value = payload.message ?? payload.statusMessage ?? '登录失败。'
      return
    }
    credentialError.value = '登录失败。'
  }
  finally {
    isCredentialSigningIn.value = false
  }
}
</script>

<template>
  <section class="flex flex-col items-center gap-4">
    <AuxlinePageHeader title="登录" variant="plain" />
    <form
      class="w-full max-w-sm flex flex-col gap-3"
      @submit.prevent="signInWithPassword"
    >
      <p v-if="resetSuccessMessage" class="text-xs text-green-600">
        {{ resetSuccessMessage }}
      </p>
      <p v-else-if="verifiedSuccessMessage" class="text-xs text-green-600">
        {{ verifiedSuccessMessage }}
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
        >
      </label>
      <label class="flex flex-col gap-1 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
        密码
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          class="h-9 px-3 border border-[var(--auxline-line)] bg-[var(--auxline-bg-emphasis)]
            text-sm text-[var(--auxline-fg)] focus-visible:outline focus-visible:outline-1
            focus-visible:outline-[var(--auxline-line)]"
          @keydown.enter.exact.prevent="signInWithPassword"
        >
      </label>
      <AuxlineBtn
        type="submit"
        variant="contrast"
        :loading="isCredentialSigningIn"
        :disabled="!email || !password"
      >
        邮箱登录
      </AuxlineBtn>
      <span v-if="credentialError" class="text-xs text-red-600">
        {{ credentialError }}
      </span>
      <NuxtLink
        to="/forgot-password"
        class="text-xs text-[var(--auxline-fg-muted)] underline underline-offset-2"
      >
        忘记密码
      </NuxtLink>
      <NuxtLink
        :to="`/register?redirect=${encodeURIComponent(redirectTarget)}`"
        class="text-xs text-[var(--auxline-fg-muted)] underline underline-offset-2"
      >
        还没有账号？去注册
      </NuxtLink>
    </form>
    <div class="flex w-full max-w-sm items-center gap-3 pt-2 text-xs font-mono uppercase tracking-[0.2em] text-[var(--auxline-fg-muted)]">
      <span class="h-px flex-1 bg-[var(--auxline-line)]" aria-hidden="true" />
      或
      <span class="h-px flex-1 bg-[var(--auxline-line)]" aria-hidden="true" />
    </div>
    <AuxlineBtn
      :loading="isSocialSigningIn"
      @click="signInWithGithub"
    >
      第三方登录
    </AuxlineBtn>
    <span v-if="socialError" class="text-xs text-red-600">
      {{ socialError }}
    </span>
  </section>
</template>
