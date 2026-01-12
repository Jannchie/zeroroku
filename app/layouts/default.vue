<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { authClient } from '~~/lib/client'

const session = authClient.useSession()
const displayName = computed(() => session.value?.data?.user?.name ?? session.value?.data?.user?.email ?? '用户')
const avatarUrl = computed(() => session.value?.data?.user?.image || null)
const avatarInitial = computed(() => displayName.value.slice(0, 1).toUpperCase())
const { activeScheme, selectedScheme, toggleScheme } = useColorScheme()
const { showSponsorsSidebar } = useSponsorSidebar()
const { count: onlineCount } = useOnlineCount()
const route = useRoute()
const lastDailyLoginUserId = ref<string | null>(null)

interface SponsorItem {
  id: string
  name: string
  amount: number
}

interface SponsorResponse {
  items: SponsorItem[]
}

const sponsorActions: { label: string, href: string }[] = [
  { label: '爱发电', href: 'https://afdian.com/a/jannchie' },
  { label: 'AZZ', href: 'https://azz.net/jannchie' },
  { label: 'B站充电', href: 'https://space.bilibili.com/1850091' },
]

const { data: sponsorsData, pending: sponsorsPending, error: sponsorsError } = useFetch<SponsorResponse>('/api/sponsors', {
  watch: false,
})

const sponsorItems = computed(() => sponsorsData.value?.items ?? [])
const sponsorSkeletons = Array.from({ length: 6 }, (_, index) => index)
const amountFormatter = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 })

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

const isHome = computed(() => route.path === '/')
const isSponsorsPage = computed(() => route.path.startsWith('/sponsors'))
const showSponsorsAside = computed(() => !isSponsorsPage.value && showSponsorsSidebar.value)

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

const onlineCountLabel = computed(() => {
  if (onlineCount.value === null) {
    return '--'
  }
  return Math.max(0, onlineCount.value).toString()
})

function isActiveRoute(to: string): boolean {
  if (to === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(to)
}

function formatAmount(value: number): string {
  if (!Number.isFinite(value)) {
    return '--'
  }
  const normalized = value / 100
  return `${amountFormatter.format(normalized)}元`
}

function displaySponsorName(name: string): string {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed : '匿名'
}

onMounted(() => {
  watch(
    () => session.value?.data?.user?.id,
    async (userId) => {
      if (!userId) {
        lastDailyLoginUserId.value = null
        return
      }
      if (lastDailyLoginUserId.value === userId) {
        return
      }
      lastDailyLoginUserId.value = userId
      try {
        await $fetch('/api/user/daily-login', { method: 'post' })
      }
      catch (error) {
        console.error('Failed to sync daily login reward.', error)
      }
    },
    { immediate: true },
  )
})
</script>

<template>
  <AuxlineRoot>
    <template #header>
      <NuxtLink
        to="/open-letter"
        class="inline-flex h-9 w-9 items-center justify-center hover:bg-[var(--auxline-bg-hover)]
          focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--auxline-line)]"
        aria-label="说明"
        title="说明"
      >
        <span class="text-base i-heroicons-information-circle-20-solid" aria-hidden="true" />
      </NuxtLink>
      <NuxtLink
        to="/changelog"
        class="inline-flex h-9 w-9 items-center justify-center hover:bg-[var(--auxline-bg-hover)]
          focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--auxline-line)]"
        aria-label="更新日志"
        title="更新日志"
      >
        <span class="text-base i-heroicons-document-text-20-solid" aria-hidden="true" />
      </NuxtLink>
    </template>
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
      <div class="relative w-full flex flex-col flex-1 min-h-full border-b-0 children:border-b children:border-[var(--auxline-line)]">
        <aside
          v-if="showSponsorsAside"
          class="hidden w-full border-b border-[var(--auxline-line)] flex-col 2xl:flex
            2xl:absolute 2xl:left-0 2xl:top-0 2xl:bottom-0 2xl:w-64 2xl:-translate-x-full 2xl:border 2xl:bg-[var(--auxline-bg)]"
        >
          <div
            class="flex flex-wrap items-center justify-between gap-1 border-b border-[var(--auxline-line)] px-1 py-1 text-[0.6rem]
              font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
          >
            <div class="flex items-center gap-1">
              <span>赞助</span>
              <span v-if="sponsorItems.length > 0" class="text-[var(--auxline-fg-muted)]">
                {{ sponsorItems.length }}
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-0">
              <a
                v-for="action in sponsorActions"
                :key="action.href"
                :href="action.href"
                target="_blank"
                rel="noreferrer"
                class="inline-flex items-center justify-center px-1 py-0.5 text-[0.55rem]
                  text-[var(--auxline-fg)] hover:bg-[var(--auxline-bg-hover)] focus-visible:outline focus-visible:outline-1
                  focus-visible:outline-[var(--auxline-line)]"
              >
                {{ action.label }}
              </a>
            </div>
          </div>
          <div class="flex flex-col flex-1 min-h-0 overflow-y-auto">
            <template v-if="sponsorsPending">
              <div
                v-for="index in sponsorSkeletons"
                :key="`sponsor-skeleton-${index}`"
                class="flex items-center justify-between gap-1 border-b border-[var(--auxline-line)] px-1 py-1 last:border-b-0"
              >
                <span class="h-3 w-24 bg-[var(--auxline-bg-emphasis)]" />
                <span class="h-3 w-10 bg-[var(--auxline-bg-emphasis)]" />
              </div>
            </template>
            <template v-else>
              <div
                v-for="item in sponsorItems"
                :key="item.id"
                class="flex items-center justify-between gap-1 border-b border-[var(--auxline-line)] px-1 py-1 text-[0.7rem] last:border-b-0"
              >
                <span class="truncate">{{ displaySponsorName(item.name) }}</span>
                <span class="shrink-0 text-[0.6rem] font-mono text-[var(--auxline-fg-muted)]">
                  {{ formatAmount(item.amount) }}
                </span>
              </div>
              <div
                v-if="sponsorItems.length === 0"
                class="px-1 py-2 text-[0.65rem] font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
              >
                暂无赞助者
              </div>
            </template>
            <p v-if="sponsorsError" class="px-1 py-1 text-[0.65rem] text-red-600">
              赞助列表加载失败
            </p>
          </div>
        </aside>
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
        <section
          v-if="isHome"
          class="flex flex-col items-center text-center"
          :class="isHome ? 'gap-1 pt-12 pb-12' : 'gap-0 py-1'"
        >
          <h1 class="text-3xl">
            ZeroRoku
          </h1>
          <p class="text-xs text-[var(--auxline-fg-muted)]">
            06数据观测站
          </p>
        </section>

        <div v-if="!isSponsorsPage" class="flex w-full justify-center lg:hidden">
          <AuxlineBtn
            to="/sponsors" size="sm" class="w-full justify-center"
          >
            赞助者
          </AuxlineBtn>
        </div>
        <div class="w-full">
          <slot />
        </div>
      </div>
    </template>
    <template #footer>
      <p class="text-sm py-2 text-center text-[var(--auxline-fg-muted)]">
        <span aria-live="polite">
          在线人数 {{ onlineCountLabel }}
        </span>
        <span class="mx-2">·</span>
        {{ new Date().getFullYear() }}
        <span class="mx-2">·</span>
        <a
          href="https://github.com/Jannchie/zeroroku"
          target="_blank"
          rel="noreferrer"
          class="underline underline-offset-4 hover:text-[var(--auxline-fg)]"
        >GitHub</a>
      </p>
    </template>
  </AuxlineRoot>
</template>
