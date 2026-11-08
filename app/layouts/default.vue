<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { authClient } from '~~/lib/client'

const session = authClient.useSession()
const isHydrated = ref(false)
const isLoggedIn = computed(() => isHydrated.value && Boolean(session.value?.data?.user))
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
  key: 'sponsors',
  watch: false,
})

const sponsorItems = computed(() => sponsorsData.value?.items ?? [])
const sponsorSkeletons = Array.from({ length: 6 }, (_, index) => index)
const amountFormatter = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 })
const isMobileCommentOpen = ref(false)

const themeIcon = computed(() => {
  return activeScheme.value === 'dark' ? 'i-heroicons-moon' : 'i-heroicons-sun'
})

const themeToggleLabel = computed(() => {
  const currentLabel = activeScheme.value === 'dark' ? '夜间' : '日间'
  const nextLabel = activeScheme.value === 'dark' ? '日间' : '夜间'
  if (selectedScheme.value === 'auto') {
    return `跟随系统(当前${currentLabel})，切换到${nextLabel}模式`
  }
  return `切换到${nextLabel}模式`
})

const isSponsorsPage = computed(() => route.path.startsWith('/sponsors'))
const showSponsorsAside = computed(() => !isSponsorsPage.value && showSponsorsSidebar.value)

const navItems = computed(() => {
  const authed = isLoggedIn.value
  const items = [
    { label: '首页', to: '/', disabled: false },
    { label: '排行榜', to: '/rank', disabled: false },
    { label: '个人', to: '/me', disabled: !authed },
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

function openMobileCommentPanel(): void {
  isMobileCommentOpen.value = true
}

function closeMobileCommentPanel(): void {
  isMobileCommentOpen.value = false
}

onMounted(() => {
  isHydrated.value = true
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
        // 领到奖励时响应里带 creditChange，由 $fetch 层统一弹提示
        await $fetch('/api/user/daily-login', { method: 'post' })
      }
      catch (error) {
        console.error('Failed to sync daily login reward.', error)
      }
    },
    { immediate: true },
  )
})

watch(
  () => route.path,
  () => {
    isMobileCommentOpen.value = false
  },
)
</script>

<template>
  <AuxlineRoot>
    <!-- 页头一行：左边品牌格和左侧栏同宽，竖线与下方侧栏连成一条；中间是导航，右边是图标按钮和账号 -->
    <template #header>
      <NuxtLink
        to="/"
        class="flex shrink-0 items-center gap-2.5 border-r border-[var(--auxline-line)] px-4 text-[var(--auxline-fg)] 2xl:w-60 2xl:px-6"
        aria-label="ZeroRoku 首页"
      >
        <img src="/light-icon.svg" alt="" class="zr-logo-light h-5 w-5" width="20" height="20">
        <img src="/dark-icon.svg" alt="" class="zr-logo-dark h-5 w-5" width="20" height="20">
        <span class="hidden text-[15px] font-semibold tracking-tight sm:inline">ZeroRoku</span>
        <span class="hidden text-xs text-[var(--auxline-fg-muted)] lg:inline">06数据观测站</span>
      </NuxtLink>
      <nav class="zr-nav flex min-w-0 items-center gap-1 overflow-x-auto px-2 sm:px-4" aria-label="主导航">
        <AuxlineBtn
          v-for="item in navItems"
          :key="item.to"
          size="md"
          :to="item.to"
          :disabled="item.disabled"
          :variant="isActiveRoute(item.to) ? 'contrast' : 'solid'"
          :aria-current="isActiveRoute(item.to) ? 'page' : undefined"
        >
          {{ item.label }}
        </AuxlineBtn>
      </nav>
    </template>
    <template #headerActions>
      <NuxtLink
        to="/sponsors"
        class="zr-icon-btn hidden xl:inline-flex 2xl:hidden"
        aria-label="赞助者"
        title="赞助者"
      >
        <span class="i-heroicons-heart h-4 w-4" aria-hidden="true" />
      </NuxtLink>
      <NuxtLink
        to="/open-letter"
        class="zr-icon-btn hidden sm:inline-flex"
        aria-label="说明"
        title="说明"
      >
        <span class="i-heroicons-information-circle h-4 w-4" aria-hidden="true" />
      </NuxtLink>
      <NuxtLink
        to="/changelog"
        class="zr-icon-btn hidden sm:inline-flex"
        aria-label="更新日志"
        title="更新日志"
      >
        <span class="i-heroicons-document-text h-4 w-4" aria-hidden="true" />
      </NuxtLink>
      <button
        type="button"
        class="zr-icon-btn inline-flex"
        :aria-label="themeToggleLabel"
        :title="themeToggleLabel"
        :aria-pressed="activeScheme === 'dark'"
        @click="toggleScheme"
      >
        <span class="h-4 w-4" :class="[themeIcon]" aria-hidden="true" />
      </button>
      <span class="mx-1 h-5 w-px bg-[var(--auxline-line)]" aria-hidden="true" />
      <template v-if="isLoggedIn">
        <AuxlineMenu align="right">
          <template #trigger>
            <button
              type="button"
              class="flex h-8 cursor-pointer items-center gap-2 rounded-md pl-1 pr-2 text-left text-[13px] text-[var(--auxline-fg-2)]
                hover:bg-[var(--auxline-bg-hover)] hover:text-[var(--auxline-fg)]
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--auxline-line-strong)]"
            >
              <AuxlineAvatar :src="avatarUrl" :name="avatarInitial" :size="24" />
              <span class="hidden max-w-32 truncate sm:inline">
                {{ displayName }}
              </span>
            </button>
          </template>
          <div class="flex flex-col p-1">
            <button
              type="button"
              class="h-8 w-full rounded-md px-3 text-left text-[13px] text-[var(--auxline-fg-2)] hover:bg-[var(--auxline-bg-hover)] hover:text-[var(--auxline-fg)]"
              @click="authClient.signOut()"
            >
              退出登录
            </button>
          </div>
        </AuxlineMenu>
      </template>
      <template v-else>
        <AuxlineBtn to="/login" size="sm">
          登录
        </AuxlineBtn>
        <AuxlineBtn to="/register" size="sm" variant="contrast">
          注册
        </AuxlineBtn>
      </template>
    </template>
    <template #main>
      <!-- 主体三栏：赞助 | 内容 | 评论；两侧栏 sticky 在页头下方、各自滚动。窄于 xl 时侧栏收起，改成内容上方的两个入口 -->
      <div class="flex w-full flex-1">
        <aside
          v-if="showSponsorsAside"
          class="zr-side hidden w-60 shrink-0 flex-col border-r border-[var(--auxline-line)] bg-[var(--auxline-side)] 2xl:flex"
        >
          <div class="px-6 pb-3 pt-6">
            <p class="text-[13px] font-medium text-[var(--auxline-fg-2)]">
              赞助者<span v-if="sponsorItems.length > 0" class="ml-1.5 font-normal text-[var(--auxline-fg-muted)]">{{ sponsorItems.length }}</span>
            </p>
            <p class="mt-0.5 text-xs text-[var(--auxline-fg-muted)]">
              感谢支持，服务器费用由此而来
            </p>
          </div>
          <div class="flex flex-wrap gap-1.5 border-b border-[var(--auxline-line)] px-6 pb-4">
            <a
              v-for="action in sponsorActions"
              :key="action.href"
              :href="action.href"
              target="_blank"
              rel="noreferrer"
              class="inline-flex h-6 items-center rounded-full px-2.5 text-xs text-[var(--auxline-fg-2)]
                shadow-[inset_0_0_0_1px_var(--auxline-line-strong)] hover:bg-[var(--auxline-bg-hover)] hover:text-[var(--auxline-fg)]"
            >
              {{ action.label }}
            </a>
          </div>
          <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3">
            <template v-if="sponsorsPending">
              <div
                v-for="index in sponsorSkeletons"
                :key="`sponsor-skeleton-${index}`"
                class="flex items-center justify-between gap-2 px-2 py-1.5"
              >
                <span class="h-3 w-24 rounded bg-[var(--auxline-bg-emphasis)]" />
                <span class="h-3 w-10 rounded bg-[var(--auxline-bg-emphasis)]" />
              </div>
            </template>
            <template v-else>
              <div
                v-for="item in sponsorItems"
                :key="item.id"
                class="flex h-8 shrink-0 items-center justify-between gap-2 rounded-md px-3 text-[13px] text-[var(--auxline-fg-2)] hover:bg-[var(--auxline-bg-emphasis)]"
              >
                <span class="truncate">{{ displaySponsorName(item.name) }}</span>
                <span class="shrink-0 text-xs text-[var(--auxline-fg-muted)]">
                  {{ formatAmount(item.amount) }}
                </span>
              </div>
              <p
                v-if="sponsorItems.length === 0"
                class="px-2 py-2 text-xs text-[var(--auxline-fg-muted)]"
              >
                暂无赞助者
              </p>
            </template>
            <p v-if="sponsorsError" class="px-2 py-1 text-xs text-red-600">
              赞助列表加载失败
            </p>
          </div>
        </aside>

        <div class="flex min-w-0 flex-1 flex-col">
          <div class="flex w-full gap-2 border-b border-[var(--auxline-line)] px-[var(--zr-gutter)] py-2 xl:hidden">
            <AuxlineBtn
              to="/sponsors"
              size="sm"
              class="flex-1"
              :disabled="isSponsorsPage"
            >
              赞助者
            </AuxlineBtn>
            <AuxlineBtn
              size="sm"
              class="flex-1"
              :aria-expanded="isMobileCommentOpen ? 'true' : 'false'"
              aria-controls="mobile-comment-panel"
              @click="openMobileCommentPanel"
            >
              评论
            </AuxlineBtn>
          </div>
          <div class="w-full flex-1">
            <slot />
          </div>
        </div>

        <aside class="zr-side hidden w-80 shrink-0 flex-col border-l border-[var(--auxline-line)] bg-[var(--auxline-side)] xl:flex">
          <AuxlineCommentSidebar :limit="30" />
        </aside>
      </div>
      <ClientOnly>
        <Teleport to=".auxline-root">
          <div
            v-if="isMobileCommentOpen"
            class="fixed inset-0 z-50 flex xl:hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-comment-panel-title"
            aria-describedby="mobile-comment-panel"
          >
            <button
              type="button"
              class="absolute inset-0 bg-black/40"
              aria-label="关闭评论面板"
              @click="closeMobileCommentPanel"
            />
            <div
              class="relative z-10 mt-auto flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border-t border-[var(--auxline-line-strong)]
                bg-[var(--auxline-bg)] pb-[env(safe-area-inset-bottom)]"
              @click.stop
            >
              <div class="flex items-center justify-between border-b border-[var(--auxline-line)] px-4 py-2">
                <span id="mobile-comment-panel-title" class="auxline-label text-[var(--auxline-fg-muted)]">评论</span>
                <AuxlineBtn size="xs" type="button" @click="closeMobileCommentPanel">
                  关闭
                </AuxlineBtn>
              </div>
              <div id="mobile-comment-panel" class="min-h-0 flex-1 overflow-y-auto">
                <AuxlineCommentSidebar :limit="30" />
              </div>
            </div>
          </div>
        </Teleport>
      </ClientOnly>
    </template>
    <template #footer>
      <p class="flex items-center justify-center gap-2 py-4 text-xs text-[var(--auxline-fg-muted)]">
        <span aria-live="polite">在线 {{ onlineCountLabel }}</span>
        <span aria-hidden="true">·</span>
        <span>© {{ new Date().getFullYear() }} ZeroRoku</span>
        <span aria-hidden="true">·</span>
        <a
          href="https://github.com/Jannchie/zeroroku"
          target="_blank"
          rel="noreferrer"
          class="hover:text-[var(--auxline-fg)]"
        >GitHub</a>
      </p>
    </template>
  </AuxlineRoot>
</template>

<style>
.zr-logo-dark { display: none; }
:root[data-scheme='dark'] .zr-logo-light { display: none; }
:root[data-scheme='dark'] .zr-logo-dark { display: block; }

.zr-nav { scrollbar-width: none; }
.zr-nav::-webkit-scrollbar { display: none; }

.zr-icon-btn {
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: var(--auxline-fg-2);
  transition: background-color .15s, color .15s;
}
.zr-icon-btn:hover { color: var(--auxline-fg); background: var(--auxline-bg-hover); }
.zr-icon-btn:focus-visible { outline: 2px solid var(--auxline-line-strong); outline-offset: 1px; }

/* 侧栏：钉在页头下方，高度占满视口，内容自己滚 */
.zr-side {
  position: sticky;
  top: var(--zr-header-h);
  align-self: flex-start;
  height: calc(100vh - var(--zr-header-h));
}
</style>
