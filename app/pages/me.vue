<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
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
const route = useRoute()
const activeTab = computed<'profile' | 'security'>(() => {
  return route.path.startsWith('/me/security') ? 'security' : 'profile'
})
const meTabs = [
  { key: 'profile', label: '资料', to: '/me' },
  { key: 'security', label: '安全', to: '/me/security' },
] as const
const loginLink = computed(() => `/login?redirect=${encodeURIComponent(route.fullPath)}`)

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
  <section class="flex w-full flex-col">
    <AuxlinePageHeader
      title="个人资料"
      subtitle="基础信息与账户概览"
    />

    <div v-if="!user" class="flex flex-col items-center gap-4 px-4 py-16 text-center">
      <p class="text-[13px] text-[var(--auxline-fg-muted)]">
        当前未登录
      </p>
      <AuxlineBtn :to="loginLink" variant="contrast">
        去登录
      </AuxlineBtn>
    </div>

    <div v-else class="w-full">
      <div class="flex items-start gap-4 border-b border-[var(--auxline-line)] px-[var(--zr-gutter)] py-6">
        <AuxlineAvatar :src="avatarUrl" :name="avatarInitial" :size="64" />
        <div class="flex min-w-0 flex-col items-start gap-1 text-left">
          <div class="flex flex-wrap items-center gap-2">
            <form
              v-if="isEditingName"
              class="flex flex-wrap items-center gap-2"
              @submit.prevent="updateName"
            >
              <input
                v-model="nameDraft"
                type="text"
                autocomplete="username"
                :disabled="isUpdatingName"
                class="zr-input w-48"
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
              <span class="text-xl font-semibold tracking-tight">
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
          <p v-else-if="nameSuccess" class="text-xs text-green-600">
            {{ nameSuccess }}
          </p>
          <span class="text-xs text-[var(--auxline-fg-muted)]">
            {{ user.email }} · <span class="font-mono">#{{ user.id }}</span>
          </span>
        </div>
      </div>

      <div>
        <nav
          class="flex items-center gap-1 border-b border-[var(--auxline-line)] px-[calc(var(--zr-gutter)-10px)] py-2"
          aria-label="个人资料设置"
        >
          <AuxlineBtn
            v-for="tab in meTabs"
            :key="tab.key"
            :to="tab.to"
            size="sm"
            :variant="activeTab === tab.key ? 'contrast' : 'solid'"
            :aria-current="activeTab === tab.key ? 'page' : undefined"
          >
            {{ tab.label }}
          </AuxlineBtn>
        </nav>
        <NuxtPage />
      </div>
    </div>
  </section>
</template>
