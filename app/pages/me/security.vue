<script setup lang="ts">
import { computed, ref } from 'vue'
import { authClient } from '~~/lib/client'

useSeoMeta({
  title: '账户安全',
  description: '在这里更新密码并维护账户安全设置。',
  ogTitle: '账户安全',
  ogDescription: '在这里更新密码并维护账户安全设置。',
})

const session = authClient.useSession()
const user = computed(() => session.value?.data?.user ?? null)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref<string | null>(null)
const passwordSuccess = ref<string | null>(null)
const isChangingPassword = ref(false)
const canChangePassword = computed(() => {
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    return false
  }
  return !isChangingPassword.value
})

function onPasswordInput() {
  passwordError.value = null
  passwordSuccess.value = null
}

async function changePassword() {
  if (isChangingPassword.value) {
    return
  }
  passwordError.value = null
  passwordSuccess.value = null

  if (!user.value) {
    passwordError.value = '当前未登录。'
    return
  }
  if (!currentPassword.value) {
    passwordError.value = '请输入当前密码。'
    return
  }
  if (!newPassword.value) {
    passwordError.value = '请输入新密码。'
    return
  }
  if (newPassword.value.length < 8) {
    passwordError.value = '新密码至少需要 8 位。'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = '两次输入的新密码不一致。'
    return
  }
  if (newPassword.value === currentPassword.value) {
    passwordError.value = '新密码不能与当前密码一致。'
    return
  }

  isChangingPassword.value = true
  try {
    const { error } = await authClient.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
      revokeOtherSessions: true,
    })
    if (error) {
      passwordError.value = error.message ?? '修改密码失败。'
      return
    }
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    passwordSuccess.value = '密码已更新。'
  }
  catch (error) {
    if (error && typeof error === 'object' && 'message' in error) {
      passwordError.value = String(error.message) || '修改密码失败。'
      return
    }
    passwordError.value = '修改密码失败。'
  }
  finally {
    isChangingPassword.value = false
  }
}
</script>

<template>
  <div v-if="user">
    <form class="flex flex-col gap-3 px-4 py-5" @submit.prevent="changePassword">
      <p class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
        修改密码
      </p>
      <label class="flex flex-col gap-1 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
        当前密码
        <input
          v-model="currentPassword"
          type="password"
          autocomplete="current-password"
          :disabled="isChangingPassword"
          class="h-9 px-3 border border-[var(--auxline-line)] bg-[var(--auxline-bg-emphasis)]
            text-sm text-[var(--auxline-fg)] focus-visible:outline focus-visible:outline-1
            focus-visible:outline-[var(--auxline-line)]"
          @input="onPasswordInput"
        >
      </label>
      <label class="flex flex-col gap-1 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
        新密码
        <input
          v-model="newPassword"
          type="password"
          autocomplete="new-password"
          :disabled="isChangingPassword"
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
          :disabled="isChangingPassword"
          class="h-9 px-3 border border-[var(--auxline-line)] bg-[var(--auxline-bg-emphasis)]
            text-sm text-[var(--auxline-fg)] focus-visible:outline focus-visible:outline-1
            focus-visible:outline-[var(--auxline-line)]"
          @input="onPasswordInput"
        >
      </label>
      <p class="text-xs text-[var(--auxline-fg-muted)]">
        更新后将自动注销其他会话。
      </p>
      <AuxlineBtn
        type="submit"
        variant="contrast"
        :loading="isChangingPassword"
        :disabled="!canChangePassword"
      >
        更新密码
      </AuxlineBtn>
      <p v-if="passwordError" class="text-xs text-red-600">
        {{ passwordError }}
      </p>
      <p v-else-if="passwordSuccess" class="text-xs text-blue-600">
        {{ passwordSuccess }}
      </p>
    </form>
  </div>
</template>
