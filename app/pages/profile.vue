<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { authClient } from '~~/lib/client'

definePageMeta({
  middleware: ['auth'],
})

const session = authClient.useSession()
const user = computed(() => session.value?.data?.user ?? null)
const displayName = computed(() => user.value?.name ?? user.value?.email ?? '用户')
const avatarUrl = computed(() => user.value?.image ?? null)
const avatarInitial = computed(() => displayName.value.slice(0, 1).toUpperCase())
const isEditingName = ref(false)
const nameDraft = ref('')
const nameTouched = ref(false)
const nameError = ref<string | null>(null)
const nameSuccess = ref<string | null>(null)
const isUpdatingName = ref(false)
const canSaveName = computed(() => {
  if (!isEditingName.value) {
    return false
  }
  const trimmed = nameDraft.value.trim()
  if (!trimmed || !user.value) {
    return false
  }
  return trimmed !== (user.value.name ?? '')
})

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

watch(
  () => user.value?.name,
  (value) => {
    if (!nameTouched.value && !isEditingName.value) {
      nameDraft.value = value ?? ''
    }
  },
  { immediate: true },
)

function startNameEdit() {
  if (!user.value) {
    nameError.value = '当前未登录。'
    return
  }
  nameDraft.value = user.value.name ?? ''
  nameTouched.value = false
  nameError.value = null
  nameSuccess.value = null
  isEditingName.value = true
}

function cancelNameEdit() {
  nameDraft.value = user.value?.name ?? ''
  nameTouched.value = false
  nameError.value = null
  nameSuccess.value = null
  isEditingName.value = false
}

function onNameInput() {
  if (!nameTouched.value) {
    nameTouched.value = true
  }
  nameError.value = null
  nameSuccess.value = null
}

async function updateName() {
  if (!isEditingName.value) {
    return
  }
  if (isUpdatingName.value) {
    return
  }
  nameError.value = null
  nameSuccess.value = null

  const trimmed = nameDraft.value.trim()
  nameDraft.value = trimmed
  if (!trimmed) {
    nameError.value = '用户名不能为空。'
    return
  }
  if (trimmed.length < 2 || trimmed.length > 32) {
    nameError.value = '用户名长度需在 2-32 个字符之间。'
    return
  }
  if (!user.value) {
    nameError.value = '当前未登录。'
    return
  }
  if (trimmed === (user.value.name ?? '')) {
    nameSuccess.value = '用户名未变化。'
    return
  }

  isUpdatingName.value = true
  try {
    const { error } = await authClient.updateUser({
      name: trimmed,
    })
    if (error) {
      nameError.value = error.message ?? '更新失败。'
      return
    }
    nameTouched.value = false
    nameSuccess.value = '用户名已更新。'
    isEditingName.value = false
  }
  catch (error) {
    if (error && typeof error === 'object' && 'message' in error) {
      nameError.value = String(error.message) || '更新失败。'
      return
    }
    nameError.value = '更新失败。'
  }
  finally {
    isUpdatingName.value = false
  }
}
</script>

<template>
  <section class="flex flex-col items-center">
    <AuxlinePageHeader
      title="个人资料"
      subtitle="基础信息与账户概览"
    />

    <div v-if="!user" class="w-full max-w-md sm:border-x border-[var(--auxline-line)] px-4 py-6 text-center">
      <p class="text-sm font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
        当前未登录
      </p>
      <AuxlineBtn to="/login?redirect=/profile" class="mt-4">
        去登录
      </AuxlineBtn>
    </div>

    <div v-else class="w-full border-[var(--auxline-line)] max-w-3xl sm:border-x">
      <div class="flex flex-col items-center sm:flex-row sm:items-start">
        <div
          class="flex h-20 w-20 items-center justify-center overflow-hidden border-r border-[var(--auxline-line)]
            bg-[var(--auxline-bg-emphasis)] text-[0.7rem] font-mono uppercase tracking-[0.12em]"
          aria-hidden="true"
        >
          <NuxtImg
            v-if="avatarUrl"
            :src="avatarUrl"
            alt=""
            class="h-full w-full object-cover"
            width="80"
            height="80"
          />
          <span v-else>
            {{ avatarInitial }}
          </span>
        </div>
        <div class="flex flex-col items-center text-center sm:items-start sm:text-left">
          <div class="flex flex-wrap items-center justify-center sm:justify-start">
            <form
              v-if="isEditingName"
              class="flex flex-wrap items-center justify-center sm:justify-start"
              @submit.prevent="updateName"
            >
              <input
                v-model="nameDraft"
                type="text"
                autocomplete="username"
                :disabled="isUpdatingName"
                class="h-8 w-48 px-3 bg-[var(--auxline-bg-emphasis)]
                  text-sm text-[var(--auxline-fg)] focus-visible:outline focus-visible:outline-1
                  focus-visible:outline-[var(--auxline-line)]"
                @input="onNameInput"
              >
              <AuxlineBtn
                type="submit"
                variant="contrast"
                size="sm"
                :loading="isUpdatingName"
                :disabled="!canSaveName"
              >
                保存
              </AuxlineBtn>
              <AuxlineBtn
                type="button"
                size="sm"
                :disabled="isUpdatingName"
                @click="cancelNameEdit"
              >
                取消
              </AuxlineBtn>
            </form>
            <template v-else>
              <span class="text-xl px-2">
                {{ displayName }}
              </span>
              <AuxlineBtn
                type="button"
                size="sm"
                @click="startNameEdit"
              >
                修改
              </AuxlineBtn>
            </template>
          </div>
          <p v-if="nameError" class="text-xs text-red-600">
            {{ nameError }}
          </p>
          <p v-else-if="nameSuccess" class="text-xs text-blue-600">
            {{ nameSuccess }}
          </p>
          <span class="text-xs px-2 font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
            {{ user.email }}
          </span>
          <span class="text-xs px-2 font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
            #{{ user.id }}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 border-t border-[var(--auxline-line)] sm:grid-cols-2">
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
  </section>
</template>
