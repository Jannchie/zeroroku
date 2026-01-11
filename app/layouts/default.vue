<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { authClient } from '~~/lib/client'

const session = authClient.useSession()
const displayName = computed(() => session.value?.data?.user?.name ?? session.value?.data?.user?.email ?? '用户')
const avatarUrl = computed(() => session.value?.data?.user?.image || null)
const avatarInitial = computed(() => displayName.value.slice(0, 1).toUpperCase())
const { activeScheme, selectedScheme, toggleScheme } = useColorScheme()
const route = useRoute()

const themeIcon = computed(() => {
  return activeScheme.value === 'dark' ? 'i-heroicons-moon-20-solid' : 'i-heroicons-sun-20-solid'
})

const themeToggleLabel = computed(() => {
  const currentLabel = activeScheme.value === 'dark' ? '夜间' : '日间'
  const nextLabel = activeScheme.value === 'dark' ? '日间' : '夜间'
  if (selectedScheme.value === 'auto') {
    return `跟随系统(当前${currentLabel})，切换到${nextLabel}模式`
  }
  return `切换到${nextLabel}模式`
})

const navItems = computed(() => {
  const isLoggedIn = Boolean(session.value?.data)
  const items = [
    { label: '首页', to: '/', disabled: false },
    { label: '排行榜', to: '/rank', disabled: false },
    { label: '个人', to: '/profile', disabled: !isLoggedIn },
    { label: '哔哩哔哩', to: '/bilibili', disabled: false },
    { label: '设置', to: '/settings', disabled: false },
  ]
  return items
})

function isActiveRoute(to: string): boolean {
  if (to === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(to)
}
</script>

<template>
  <AuxlineRoot>
    <template #headerActions>
      <button
        type="button"
        class="flex h-9 w-9 items-center justify-center hover:bg-[var(--auxline-bg-hover)]
          focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--auxline-line)]"
        :aria-label="themeToggleLabel"
        :title="themeToggleLabel"
        :aria-pressed="activeScheme === 'dark'"
        @click="toggleScheme"
      >
        <span class="text-base" :class="[themeIcon]" aria-hidden="true" />
      </button>
      <template v-if="session?.data">
        <div class="border-l-0">
          <AuxlineMenu align="right">
            <template #trigger>
              <button
                type="button"
                class="flex h-9  items-center gap-2 text-left hover:bg-[var(--auxline-bg-hover)] cursor-pointer
                  focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--auxline-line)]"
              >
                <div
                  class="flex h-9 w-9 items-center justify-center overflow-hidden border-x border-[var(--auxline-line)]
                    bg-[var(--auxline-bg-emphasis)] text-[0.6rem] font-mono uppercase tracking-[0.12em]"
                  aria-hidden="true"
                >
                  <NuxtImg
                    v-if="avatarUrl"
                    :src="avatarUrl"
                    alt=""
                    class="h-full w-full object-cover"
                    width="36"
                    height="36"
                  />
                  <span v-else>
                    {{ avatarInitial }}
                  </span>
                </div>
                <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)] pl-1 pr-2">
                  {{ displayName }}
                </span>
              </button>
            </template>
            <div class="flex flex-col">
              <button
                type="button"
                class="h-9 w-full px-3 text-left text-xs font-mono uppercase tracking-[0.12em] hover:bg-[var(--auxline-bg-hover)]"
                @click="authClient.signOut()"
              >
                退出登录
              </button>
            </div>
          </AuxlineMenu>
        </div>
      </template>
      <template v-else>
        <AuxlineBtn to="/login" class="border-l">
          登录
        </AuxlineBtn>
      </template>
    </template>
    <template #main>
      <section class="flex flex-col items-center gap-6 pt-12 pb-12">
        <h1 class="text-3xl  text-center">
          ZeroRoku
        </h1>
      </section>
      <div class="flex flex-wrap justify-center children:border-r first:children:border-l">
        <AuxlineBtn
          v-for="item in navItems"
          :key="item.to"
          size="sm"
          :to="item.to"
          :disabled="item.disabled"
          :variant="isActiveRoute(item.to) ? 'contrast' : 'solid'"
          :aria-current="isActiveRoute(item.to) ? 'page' : undefined"
        >
          {{ item.label }}
        </AuxlineBtn>
      </div>
      <slot />
    </template>
    <template #footer>
      <p class="text-sm py-2 text-center">
        {{ new Date().getFullYear() }}
      </p>
    </template>
  </AuxlineRoot>
</template>
