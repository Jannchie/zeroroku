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

interface ObserveResponse {
  ok: boolean
  cost: number
  credit: number
}

interface RecentAuthorItem {
  mid: string
  name: string | null
  face: string | null
}

useSeoMeta({
  title: 'Bilibili',
})

const searchQuery = ref('')
const searchResults = ref<AuthorSearchItem[]>([])
const searchError = ref<string | null>(null)
const searchPending = ref(false)
const hasSearched = ref(false)
const session = authClient.useSession()
const user = computed(() => session.value?.data?.user ?? null)
const observeMid = ref('')
const observePending = ref(false)
const observeError = ref<string | null>(null)
const observeSuccess = ref<string | null>(null)
const observeCost = 10
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

async function observeAuthor() {
  if (!canObserve.value || observePending.value) {
    return
  }
  if (!user.value) {
    observeError.value = '请先登录。'
    observeSuccess.value = null
    return
  }

  const trimmed = observeTarget.value
  if (!/^\d+$/.test(trimmed)) {
    observeError.value = 'MID 必须是数字。'
    observeSuccess.value = null
    return
  }

  observePending.value = true
  observeError.value = null
  observeSuccess.value = null

  try {
    const response = await $fetch<ObserveResponse>(
      `/api/bilibili/author/${encodeURIComponent(trimmed)}/observe`,
      { method: 'POST' },
    )
    observeSuccess.value = `观测已加入队列，剩余 ${formatCount(response.credit)} 积分。`
    observeMid.value = ''
    authClient.$store.notify('$sessionSignal')
  }
  catch (error) {
    if (error && typeof error === 'object' && 'data' in error) {
      const maybeData = error.data as { message?: string, statusMessage?: string }
      observeError.value = maybeData.statusMessage ?? maybeData.message ?? '观测失败。'
      return
    }
    observeError.value = '观测失败。'
  }
  finally {
    observePending.value = false
  }
}

watch(searchQuery, (value) => {
  if (!value.trim()) {
    searchResults.value = []
    searchError.value = null
    hasSearched.value = false
  }
})

watch(observeMid, () => {
  observeError.value = null
  observeSuccess.value = null
})

onMounted(() => {
  if (!import.meta.client || !globalThis.localStorage) {
    return
  }
  recentAuthors.value = parseRecentAuthors(globalThis.localStorage.getItem(recentStorageKey))
})
</script>

<template>
  <section class="flex flex-col items-center">
    <AuxlinePageHeader
      title="Bilibili"
      subtitle="数据观测站"
    />
    <BilibiliFansRankingNav />

    <div class="w-full border-b border-[var(--auxline-line)]">
      <div class="w-full max-w-3xl mx-auto sm:border-x border-[var(--auxline-line)]">
        <div class="flex items-center border-b border-[var(--auxline-line)] p-1 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
          <span>最近访问</span>
        </div>
        <div class="flex flex-wrap gap-1 p-1">
          <NuxtLink
            v-for="item in limitedRecentAuthors"
            :key="`recent-${item.mid}`"
            :to="authorLink(item.mid)"
            class="inline-flex items-center gap-2 border border-[var(--auxline-line)] pr-2 pl-0 py-0 text-xs text-[var(--auxline-fg)]
                hover:bg-[var(--auxline-bg-hover)] focus-visible:outline focus-visible:outline-1
                focus-visible:outline-[var(--auxline-line)]"
          >
            <span
              class="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden border-r border-[var(--auxline-line)]
                  bg-[var(--auxline-bg-emphasis)] text-[0.55rem] font-mono uppercase tracking-[0.12em]"
              aria-hidden="true"
            >
              <NuxtImg
                v-if="item.face"
                :src="item.face"
                alt=""
                class="h-full w-full object-cover"
                width="20"
                height="20"
              />
              <span v-else>
                {{ displayAuthorName(item).slice(0, 1) }}
              </span>
            </span>
            <span class="max-w-[8rem] truncate">
              {{ displayAuthorName(item) }}
            </span>
          </NuxtLink>
          <span
            v-if="limitedRecentAuthors.length === 0"
            class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
          >
            暂无最近访问
          </span>
        </div>
      </div>
    </div>

    <div class="w-full border-b border-[var(--auxline-line)]">
      <div class="w-full max-w-3xl mx-auto sm:border-x border-[var(--auxline-line)]">
        <div class="flex items-center border-b border-[var(--auxline-line)] p-1 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
          <span>焦点UP主</span>
        </div>
        <div class="flex flex-wrap gap-1 p-1">
          <template v-if="visitTopPending">
            <div
              v-for="item in visitTopSkeletons"
              :key="`visit-top-${item.id}`"
              class="inline-flex items-center gap-1 border border-[var(--auxline-line)] pr-2 pl-0 py-0 text-xs"
              aria-hidden="true"
            >
              <span
                class="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden border-r border-[var(--auxline-line)]
                  bg-[var(--auxline-bg-emphasis)]"
              />
              <span class="h-3 bg-[var(--auxline-bg-emphasis)]" :class="item.widthClass" />
            </div>
          </template>
          <template v-else>
            <NuxtLink
              v-for="item in visitTopItems"
              :key="item.mid"
              :to="authorLink(item.mid)"
              class="inline-flex items-center gap-2 border border-[var(--auxline-line)] pr-2 pl-0 py-0 text-xs text-[var(--auxline-fg)]
                hover:bg-[var(--auxline-bg-hover)] focus-visible:outline focus-visible:outline-1
                focus-visible:outline-[var(--auxline-line)]"
            >
              <span
                class="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden border-r border-[var(--auxline-line)]
                  bg-[var(--auxline-bg-emphasis)] text-[0.55rem] font-mono uppercase tracking-[0.12em]"
                aria-hidden="true"
              >
                <NuxtImg
                  v-if="item.face"
                  :src="item.face"
                  alt=""
                  class="h-full w-full object-cover"
                  width="20"
                  height="20"
                />
                <span v-else>
                  {{ displayAuthorName(item).slice(0, 1) }}
                </span>
              </span>
              <span class="max-w-[8rem] truncate">
                {{ displayAuthorName(item) }}
              </span>
            </NuxtLink>
            <span
              v-if="visitTopItems.length === 0"
              class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
            >
              暂无焦点UP主
            </span>
          </template>
        </div>
        <p v-if="visitTopError" class="p-1 text-xs text-red-600">
          焦点UP主加载失败
        </p>
      </div>
    </div>

    <div class="w-full border-b border-[var(--auxline-line)]">
      <div class="w-full max-w-3xl mx-auto sm:border-x border-[var(--auxline-line)]">
        <div class="h-8" aria-hidden="true" />
      </div>
    </div>

    <div class="w-full border-[var(--auxline-line)]">
      <div class="w-full max-w-3xl mx-auto sm:border-x  border-[var(--auxline-line)]">
        <div class="mx-auto border-[var(--auxline-line)]">
          <form
            class="flex flex-col sm:flex-row sm:items-end"
            @submit.prevent="observeAuthor"
          >
            <label class="flex flex-1 flex-col text-xs tracking-[0.12em] text-[var(--auxline-fg-muted)]">
              <div class="pl-1 py-1 border-b border-[var(--auxline-line)]">
                输入UP主ID观测
              </div>
              <div class="flex border-b border-[var(--auxline-line)]">
                <input
                  v-model="observeMid"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  autocomplete="off"
                  placeholder="1850091"
                  class="h-9 pl-1 grow border-[var(--auxline-line)] bg-[var(--auxline-bg-emphasis)]
                text-sm text-[var(--auxline-fg)] focus-visible:outline focus-visible:outline-1
                focus-visible:outline-[var(--auxline-line)]"
                  @keydown.enter.prevent="observeAuthor"
                >
                <AuxlineBtn
                  type="submit"
                  variant="contrast"
                  :loading="observePending"
                  :disabled="!canObserve"
                >
                  观测
                </AuxlineBtn>
              </div>
            </label>
          </form>
          <div
            class="flex items-center justify-between border-b border-[var(--auxline-line)] pl-1 text-xs
              font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
          >
            <span>观测消耗 {{ observeCost }} 积分</span>
            <span v-if="user">
              当前积分 {{ formatCount(user.credit) }}
            </span>
            <AuxlineBtn
              v-else
              size="xs"
              to="/login"
            >
              登录后观测
            </AuxlineBtn>
          </div>
          <p v-if="observeError" class="px-1 py-2 text-xs text-red-600">
            {{ observeError }}
          </p>
          <p v-else-if="observeSuccess" class="px-1 py-2 text-xs text-green-600">
            {{ observeSuccess }}
          </p>
        </div>

        <div class="border-b border-[var(--auxline-line)]">
          <div class="h-8" aria-hidden="true" />
        </div>

        <div class="mx-auto">
          <form
            class="flex flex-col sm:flex-row sm:items-end"
            @submit.prevent="searchAuthors"
          >
            <label class="flex flex-1 flex-col text-xs tracking-[0.12em] text-[var(--auxline-fg-muted)]">
              <div class="pl-1 py-1 border-b border-[var(--auxline-line)]">
                搜索UP
              </div>
              <div class="flex border-b border-[var(--auxline-line)]">
                <input
                  v-model="searchQuery"
                  type="text"
                  autocomplete="off"
                  placeholder="昵称或 MID"
                  class="h-9 pl-1 grow border-[var(--auxline-line)] bg-[var(--auxline-bg-emphasis)]
                text-sm text-[var(--auxline-fg)] focus-visible:outline focus-visible:outline-1
                focus-visible:outline-[var(--auxline-line)]"
                  @keydown.enter.prevent="searchAuthors"
                >
                <AuxlineBtn
                  type="submit"
                  variant="contrast"
                  :loading="searchPending"
                  :disabled="!canSearch"
                >
                  搜索
                </AuxlineBtn>
              </div>
            </label>
          </form>
        </div>

        <div class="border-[var(--auxline-line)]">
          <div class="flex items-center justify-between border-b border-[var(--auxline-line)] py-1 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
            <span class="px-1">搜索结果</span>
            <span class="px-1">粉丝</span>
          </div>
          <template v-if="searchPending">
            <div
              v-for="index in skeletonRows"
              :key="`search-${index}`"
              class="flex items-center justify-between border-b border-[var(--auxline-line)] last:border-b-0"
            >
              <span class="w-10 px-1 text-sm font-mono text-transparent">
                00
              </span>
              <div class="flex flex-1 items-center gap-3 pl-4">
                <div class="h-9 w-9 bg-[var(--auxline-bg-emphasis)]" aria-hidden="true" />
                <div class="flex flex-col">
                  <span class="h-4 w-32 bg-[var(--auxline-bg-emphasis)]" />
                  <span class="mt-1 h-3 w-20 bg-[var(--auxline-bg-emphasis)]" />
                </div>
              </div>
              <span class="px-1">
                <span class="block h-4 w-16 bg-[var(--auxline-bg-emphasis)]" />
              </span>
            </div>
          </template>
          <template v-else-if="hasSearched">
            <template v-for="item in searchResults" :key="item.mid">
              <NuxtLink
                v-if="isAuthorLinkable(item.mid)"
                :to="authorLink(item.mid)"
                class="flex items-center justify-between border-b border-[var(--auxline-line)] last:border-b-0 hover:bg-[var(--auxline-bg-hover)]
                  focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--auxline-line)]"
              >
                <span class="w-10 px-1 text-sm font-mono text-[var(--auxline-fg-muted)]">
                  UP
                </span>
                <div class="flex flex-1 items-center gap-3 pl-4 min-w-0">
                  <div
                    class="flex h-9 w-9 items-center justify-center overflow-hidden border-x border-[var(--auxline-line)]
                      bg-[var(--auxline-bg-emphasis)] text-xs font-mono uppercase tracking-[0.12em]"
                    aria-hidden="true"
                  >
                    <NuxtImg
                      v-if="item.face"
                      :src="item.face"
                      alt=""
                      class="h-full w-full object-cover"
                      width="36"
                      height="36"
                    />
                    <span v-else>
                      {{ displayAuthorName(item).slice(0, 1) }}
                    </span>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-sm truncate">
                      {{ displayAuthorName(item) }}
                    </span>
                    <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
                      {{ item.mid }}
                    </span>
                  </div>
                </div>
                <span class="text-sm px-1 font-mono">
                  {{ formatCount(item.fans) }}
                </span>
              </NuxtLink>
              <div
                v-else
                class="flex items-center justify-between border-b border-[var(--auxline-line)] last:border-b-0"
              >
                <span class="w-10 px-1 text-sm font-mono text-[var(--auxline-fg-muted)]">
                  UP
                </span>
                <div class="flex flex-1 items-center gap-3 pl-4 min-w-0">
                  <div
                    class="flex h-9 w-9 items-center justify-center overflow-hidden border-x border-[var(--auxline-line)]
                      bg-[var(--auxline-bg-emphasis)] text-xs font-mono uppercase tracking-[0.12em]"
                    aria-hidden="true"
                  >
                    <NuxtImg
                      v-if="item.face"
                      :src="item.face"
                      alt=""
                      class="h-full w-full object-cover"
                      width="36"
                      height="36"
                    />
                    <span v-else>
                      {{ displayAuthorName(item).slice(0, 1) }}
                    </span>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-sm truncate">
                      {{ displayAuthorName(item) }}
                    </span>
                    <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
                      {{ item.mid }}
                    </span>
                  </div>
                </div>
                <span class="text-sm px-1 font-mono">
                  {{ formatCount(item.fans) }}
                </span>
              </div>
            </template>
            <div
              v-if="searchResults.length === 0"
              class="py-6 text-center text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
            >
              暂无结果
            </div>
          </template>
          <div
            v-else
            class="py-6 text-center text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
          >
            输入关键词开始搜索
          </div>
          <p v-if="searchError" class="px-4 py-2 text-xs text-red-600">
            {{ searchError }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
