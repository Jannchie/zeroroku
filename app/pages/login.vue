<script setup lang="ts">
import { ref } from 'vue'
import { useNuxtApp } from '#app'
import { authClient } from '~~/lib/client'

const { $fetch } = useNuxtApp()
const identifier = ref('')
const password = ref('')
const credentialError = ref<string | null>(null)
const socialError = ref<string | null>(null)
const isCredentialSigningIn = ref(false)
const isSocialSigningIn = ref(false)

async function signInWithGithub() {
  socialError.value = null
  isSocialSigningIn.value = true

  try {
    const callbackURL = globalThis.window === undefined ? '/' : globalThis.location.origin
    const { data, error } = await authClient.signIn.social({
      provider: 'github',
      callbackURL,
    })

    if (error) {
      socialError.value = error.message ?? 'Sign in failed.'
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
  credentialError.value = null
  isCredentialSigningIn.value = true

  try {
    const trimmed = identifier.value.trim()
    if (!trimmed) {
      credentialError.value = '请输入用户名或邮箱。'
      return
    }
    if (!password.value) {
      credentialError.value = '请输入密码。'
      return
    }

    if (trimmed.includes('@')) {
      const { error } = await authClient.signIn.email({
        email: trimmed,
        password: password.value,
      })

      if (error) {
        credentialError.value = error.message ?? 'Sign in failed.'
      }
      return
    }

    await $fetch('/api/auth/sign-in-identifier', {
      method: 'POST',
      body: {
        identifier: trimmed,
        password: password.value,
      },
    })
  }
  catch (error) {
    if (error && typeof error === 'object' && 'data' in error) {
      const maybeData = error.data as { message?: string; statusMessage?: string }
      credentialError.value = maybeData.message ?? maybeData.statusMessage ?? 'Sign in failed.'
      return
    }
    credentialError.value = 'Sign in failed.'
  }
  finally {
    isCredentialSigningIn.value = false
  }
}
</script>

<template>
  <section class="flex flex-col items-center gap-4 pt-12 pb-12">
    <h1 class="text-3xl font-bold text-center">
      登录
    </h1>
    <form
      class="w-full max-w-sm flex flex-col gap-3"
      @submit.prevent="signInWithPassword"
    >
      <label class="flex flex-col gap-1 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
        用户名或邮箱
        <input
          v-model="identifier"
          type="text"
          autocomplete="username"
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
        >
      </label>
      <AuxlineBtn
        type="submit"
        :loading="isCredentialSigningIn"
        :disabled="!identifier || !password"
      >
        用户名登录
      </AuxlineBtn>
      <span v-if="credentialError" class="text-xs text-red-600">
        {{ credentialError }}
      </span>
    </form>
    <div class="flex w-full max-w-sm items-center gap-3 pt-2 text-[0.65rem] font-mono uppercase tracking-[0.2em] text-[var(--auxline-fg-muted)]">
      <span class="h-px flex-1 bg-[var(--auxline-line)]" aria-hidden="true" />
      或
      <span class="h-px flex-1 bg-[var(--auxline-line)]" aria-hidden="true" />
    </div>
    <AuxlineBtn
      :loading="isSocialSigningIn"
      @click="signInWithGithub"
    >
      GitHub 登录
    </AuxlineBtn>
    <span v-if="socialError" class="text-xs text-red-600">
      {{ socialError }}
    </span>
  </section>
</template>
