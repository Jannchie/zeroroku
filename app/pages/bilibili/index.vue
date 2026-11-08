<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { authClient } from '~~/lib/client'

interface AuthorSearchItem {
  mid: string
  name: string | null
  face: string | null
  fans: number
}

interface AuthorSearchResponse {
  items: AuthorSearchItem[]
}

interface VisitTopItem {
  mid: string
  name: string | null
  face: string | null
  visits: number
}

interface VisitTopResponse {
  items: VisitTopItem[]
}

interface RecentAuthorItem {
  mid: string
  name: string | null
  face: string | null
}

const pageTitle = 'Bilibili'
const pageDescription = 'ZeroRoku 06数据观测站的 Bilibili 分区，提供 UP 主粉丝总榜、1/7 日涨粉与掉粉榜、UP 主搜索与观测入口、最近访问与热门账号速览。'

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
})

const searchQuery = ref('')
const searchResults = ref<AuthorSearchItem[]>([])
const searchError = ref<string | null>(null)
const searchPending = ref(false)
const hasSearched = ref(false)
const session = authClient.useSession()
const user = computed(() => session.value?.data?.user ?? null)
const observeMid = ref('')
const toast = useToast()
const { observe, pending: observePending, cost: observeCost } = useObserveAuthor()
const recentAuthors = ref<RecentAuthorItem[]>([])
const recentStorageKey = 'bilibili_recent_authors'
const recentLimit = 16

const { data: visitTopData, pending: visitTopPending, error: visitTopError } = useFetch<VisitTopResponse>(
  '/api/bilibili/visit-top',
  {
    watch: false,
  },
)

const visitTopItems = computed(() => visitTopData.value?.items ?? [])
const limitedRecentAuthors = computed(() => recentAuthors.value.slice(0, recentLimit))
const observeTarget = computed(() => observeMid.value.trim())
const canObserve = computed(() => observeTarget.value.length > 0 && !observePending.value)

const formatter = new Intl.NumberFormat('zh-CN')
const skeletonRows = Array.from({ length: 6 }, (_, index) => index)
const visitTopSkeletonWidths = [
  'w-10',
  'w-16',
  'w-12',
  'w-20',
  'w-14',
  'w-24',
  'w-12',
  'w-18',
  'w-16',
  'w-22',
  'w-14',
  'w-20',
  'w-12',
  'w-24',
  'w-16',
  'w-18',
]
const visitTopSkeletons = visitTopSkeletonWidths.map((widthClass, index) => ({
  id: index,
  widthClass,
}))
const NuxtLinkComponent = resolveComponent('NuxtLink')
const canSearch = computed(() => searchQuery.value.trim().length > 0 && !searchPending.value)

function formatCount(value: number | string | undefined | null): string {
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isNaN(parsed)) {
      return '--'
    }
    return formatter.format(parsed)
  }
  if (typeof value !== 'number') {
    return '--'
  }
  return formatter.format(value)
}

function displayAuthorName(item: { name: string | null, mid: string }): string {
  if (item.name && item.name.trim().length > 0) {
    return item.name
  }
  return item.mid ? `UP ${item.mid}` : '未知'
}

function buildAuthorLink(mid: string | null | undefined): string | null {
  if (!mid) {
    return null
  }
  const trimmed = mid.trim()
  if (!trimmed) {
    return null
  }
  return `/bilibili/author/${encodeURIComponent(trimmed)}`
}

function isAuthorLinkable(mid: string | null | undefined): boolean {
  return buildAuthorLink(mid) !== null
}

function authorLink(mid: string | null | undefined): string {
  return buildAuthorLink(mid) ?? ''
}

function parseRecentAuthors(raw: string | null): RecentAuthorItem[] {
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter((item): item is RecentAuthorItem => {
        if (!item || typeof item !== 'object') {
          return false
        }
        const record = item as Record<string, unknown>
        return typeof record.mid === 'string'
      })
      .map(item => ({
        mid: item.mid,
        name: typeof item.name === 'string' ? item.name : null,
        face: typeof item.face === 'string' ? item.face : null,
      }))
  }
  catch {
    return []
  }
}

async function searchAuthors() {
  const keyword = searchQuery.value.trim()
  if (!keyword || searchPending.value) {
    return
  }
  searchPending.value = true
  searchError.value = null

  try {
    const response = await $fetch<AuthorSearchResponse>('/api/bilibili/search', {
      query: { q: keyword },
    })
    searchResults.value = response.items
  }
  catch {
    searchError.value = '搜索失败'
    searchResults.value = []
  }
  finally {
    searchPending.value = false
    hasSearched.value = true
  }
}

async function observeAuthor(): Promise<void> {
  if (!canObserve.value) {
    return
  }
  // 未登录时按钮换成了登录链接，但在输入框里回车仍会提交表单
  if (!user.value) {
    toast.show('请先登录', { tone: 'error' })
    return
  }
  if (await observe(observeTarget.value)) {
    observeMid.value = ''
  }
}

watch(searchQuery, (value) => {
  if (!value.trim()) {
    searchResults.value = []
    searchError.value = null
    hasSearched.value = false
  }
})


onMounted(() => {
  if (!import.meta.client || !globalThis.localStorage) {
    return
  }
  recentAuthors.value = parseRecentAuthors(globalThis.localStorage.getItem(recentStorageKey))
})
</script>

<template>
  <section class="flex w-full flex-col">
    <AuxlinePageHeader
      :bordered="false"
      title="Bilibili"
      subtitle="UP 主粉丝数据观测"
    />
    <BilibiliFansRankingNav />

    <!-- 主线只有一条：搜索 → 结果；发现（最近访问 / 焦点）和观测排在后面 -->
    <form class="zr-section" @submit.prevent="searchAuthors">
      <label class="zr-search">
        <span class="i-heroicons-magnifying-glass h-[18px] w-[18px] shrink-0 text-[var(--auxline-fg-muted)]" aria-hidden="true" />
        <input
          v-model="searchQuery"
          type="search"
          autocomplete="off"
          placeholder="搜索 UP 主昵称或 MID"
          aria-label="搜索 UP 主"
        >
        <AuxlineBtn
          type="submit"
          variant="contrast"
          :loading="searchPending"
          :disabled="!canSearch"
        >
          搜索
        </AuxlineBtn>
      </label>
      <p class="mt-3 text-[13px] text-[var(--auxline-fg-muted)]">
        名字包含关键词即可命中，粉丝多的 UP 主排在前面
      </p>
      <p v-if="searchError" class="mt-2 text-[13px] text-red-600">
        {{ searchError }}
      </p>
    </form>

    <div v-if="searchPending || hasSearched" class="border-t border-[var(--auxline-line)]">
      <div class="zr-row-head">
        <span>{{ searchPending ? '搜索中' : `找到 ${searchResults.length} 位 UP 主` }}</span>
        <span>粉丝</span>
      </div>
      <template v-if="searchPending">
        <div v-for="index in skeletonRows" :key="`search-${index}`" class="zr-row">
          <span class="h-10 w-10 shrink-0 rounded-full bg-[var(--auxline-bg-emphasis)]" aria-hidden="true" />
          <span class="flex flex-1 flex-col gap-2">
            <span class="h-3.5 w-36 rounded bg-[var(--auxline-bg-emphasis)]" />
            <span class="h-3 w-20 rounded bg-[var(--auxline-bg-emphasis)]" />
          </span>
          <span class="h-3.5 w-20 rounded bg-[var(--auxline-bg-emphasis)]" />
        </div>
      </template>
      <template v-else>
        <component
          :is="isAuthorLinkable(item.mid) ? NuxtLinkComponent : 'div'"
          v-for="item in searchResults"
          :key="item.mid"
          :to="isAuthorLinkable(item.mid) ? authorLink(item.mid) : undefined"
          class="zr-row"
          :class="isAuthorLinkable(item.mid) ? 'zr-row-link' : ''"
        >
          <AuxlineAvatar :src="item.face" :name="displayAuthorName(item)" :size="40" />
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="zr-row-name truncate">{{ displayAuthorName(item) }}</span>
            <span class="zr-row-meta font-mono">{{ item.mid }}</span>
          </span>
          <span class="zr-row-value shrink-0">{{ formatCount(item.fans) }}</span>
        </component>
        <p v-if="searchResults.length === 0" class="zr-empty">
          没有找到匹配的 UP 主
        </p>
      </template>
    </div>

    <div class="grid grid-cols-1 border-t border-[var(--auxline-line)] lg:grid-cols-2">
      <section class="zr-section border-b border-[var(--auxline-line)] lg:border-b-0 lg:border-r">
        <h2 class="zr-section-title">
          最近访问<small v-if="limitedRecentAuthors.length > 0">{{ limitedRecentAuthors.length }}</small>
        </h2>
        <div class="flex flex-wrap gap-2">
          <NuxtLink
            v-for="item in limitedRecentAuthors"
            :key="`recent-${item.mid}`"
            :to="authorLink(item.mid)"
            class="zr-chip"
          >
            <AuxlineAvatar :src="item.face" :name="displayAuthorName(item)" :size="24" />
            <span class="max-w-[10rem] truncate">{{ displayAuthorName(item) }}</span>
          </NuxtLink>
          <p v-if="limitedRecentAuthors.length === 0" class="text-[13px] text-[var(--auxline-fg-muted)]">
            还没有访问过 UP 主，访问过的会出现在这里
          </p>
        </div>
      </section>

      <section class="zr-section">
        <h2 class="zr-section-title">
          焦点 UP 主<small>近期访问最多</small>
        </h2>
        <div class="flex flex-wrap gap-2">
          <template v-if="visitTopPending">
            <span
              v-for="item in visitTopSkeletons"
              :key="`visit-top-${item.id}`"
              class="zr-chip pointer-events-none"
              aria-hidden="true"
            >
              <span class="zr-avatar h-6 w-6" />
              <span class="h-3 rounded bg-[var(--auxline-bg-emphasis)]" :class="item.widthClass" />
            </span>
          </template>
          <template v-else>
            <NuxtLink
              v-for="item in visitTopItems"
              :key="item.mid"
              :to="authorLink(item.mid)"
              class="zr-chip"
            >
              <AuxlineAvatar :src="item.face" :name="displayAuthorName(item)" :size="24" />
              <span class="max-w-[10rem] truncate">{{ displayAuthorName(item) }}</span>
            </NuxtLink>
            <p v-if="visitTopItems.length === 0" class="text-[13px] text-[var(--auxline-fg-muted)]">
              暂无焦点 UP 主
            </p>
          </template>
        </div>
        <p v-if="visitTopError" class="mt-3 text-[13px] text-red-600">
          焦点 UP 主加载失败
        </p>
      </section>
    </div>

    <!-- 观测：次要操作，说明在左、输入在右 -->
    <form
      class="zr-section flex flex-col gap-4 border-t border-[var(--auxline-line)] lg:flex-row lg:items-center lg:justify-between"
      @submit.prevent="observeAuthor"
    >
      <div>
        <h2 class="zr-section-title !mb-1">
          找不到想看的 UP 主？
        </h2>
        <p class="text-[13px] text-[var(--auxline-fg-muted)]">
          输入 MID 加入观测队列，之后会定期抓取粉丝数。每次消耗 {{ observeCost }} 积分<template v-if="user">
            ，当前积分 {{ formatCount(user.credit) }}
          </template>。
        </p>
      </div>
      <div class="flex w-full gap-2 lg:w-auto">
        <input
          v-model="observeMid"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          autocomplete="off"
          placeholder="UP 主 MID，如 1850091"
          aria-label="UP 主 MID"
          class="zr-input min-w-0 flex-1 font-mono lg:w-64 lg:flex-none"
        >
        <AuxlineBtn
          v-if="user"
          type="submit"
          size="lg"
          variant="contrast"
          :loading="observePending"
          :disabled="!canObserve"
        >
          观测
        </AuxlineBtn>
        <AuxlineBtn v-else to="/login" size="lg" variant="contrast">
          登录后观测
        </AuxlineBtn>
      </div>
    </form>
  </section>
</template>
