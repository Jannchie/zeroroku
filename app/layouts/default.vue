<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { authClient } from '~~/lib/client'

const session = authClient.useSession()
const displayName = computed(() => session.value?.data?.user?.name ?? session.value?.data?.user?.email ?? '用户')
const avatarUrl = computed(() => session.value?.data?.user?.image || null)
const avatarInitial = computed(() => displayName.value.slice(0, 1).toUpperCase())
const route = useRoute()

const navItems = [
  { label: '首页', to: '/' },
  { label: '排行榜', to: '/rank' },
  { label: '个人', to: '/profile' },
  { label: '哔哩哔哩', to: '/bilibili' },
  { label: '设置', to: '/settings' },
]

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
      <div class="flex items-center gap-3">
        <template v-if="session?.data">
          <AuxlineMenu align="right">
            <template #trigger>
              <button
                type="button"
                class="flex h-9 items-center gap-2 px-1 text-left hover:bg-[var(--auxline-bg-hover)] cursor-pointer
                  focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--auxline-line)]"
              >
                <div
                  class="flex h-9 w-9 items-center justify-center overflow-hidden border border-[var(--auxline-line)]
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
            <div class="flex flex-col py-1">
              <button
                type="button"
                class="h-9 w-full px-3 text-left text-xs font-mono uppercase tracking-[0.12em] hover:bg-[var(--auxline-bg-hover)]"
                @click="authClient.signOut()"
              >
                退出登录
              </button>
            </div>
          </AuxlineMenu>
        </template>
        <template v-else>
          <AuxlineBtn to="/login">
            登录
          </AuxlineBtn>
        </template>
      </div>
    </template>
    <template #main>
      <section class="flex flex-col items-center gap-6 pt-12 pb-12">
        <h1 class="text-3xl font-bold text-center">
          ZeroRoku
        </h1>
      </section>
      <div class="flex flex-wrap justify-center children:border-r first:children:border-l">
        <AuxlineBtn
          v-for="item in navItems"
          :key="item.to"
          size="sm"
          :to="item.to"
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
