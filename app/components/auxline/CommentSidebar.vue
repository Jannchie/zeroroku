<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { authClient } from '~~/lib/client'
import { formatDateTime } from '~~/lib/formatDateTime'

interface CommentItem {
  id: string
  uid: string | null
  name: string | null
  avatar: string | null
  content: string | null
  createdAt: string | null
  likes: number
  dislikes: number
}

interface CommentsResponse {
  path: string
  total: number
  items: CommentItem[]
}

const props = withDefaults(defineProps<{
  limit?: number
}>(), {
  limit: 30,
})

const MAX_CONTENT_LENGTH = 500
const MAX_LIMIT = 100

const route = useRoute()
const session = authClient.useSession()
const isHydrated = ref(false)
const path = computed(() => route.path || '/')
const isLoggedIn = computed(() => isHydrated.value && Boolean(session.value?.data?.user))

const limit = computed(() => {
  const raw = props.limit
  if (!Number.isFinite(raw) || raw <= 0) {
    return 30
  }
  return Math.min(Math.floor(raw), MAX_LIMIT)
})

const { data, pending, error, refresh } = useFetch<CommentsResponse>(
  () => `/api/comments?path=${encodeURIComponent(path.value)}&limit=${limit.value}`,
  { watch: [path, limit] },
)

const items = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const commentDraft = ref('')
const toast = useToast()
const isSubmitting = ref(false)
const canSubmit = computed(() => {
  return isLoggedIn.value && commentDraft.value.trim().length > 0 && !isSubmitting.value
})
const inputPlaceholder = computed(() => {
  return isLoggedIn.value ? '写下你的评论…' : '登录后可评论'
})

const countFormatter = new Intl.NumberFormat('zh-CN')
const skeletonRows = Array.from({ length: 8 }, (_, index) => index)

function formatDate(value: string | null | undefined): string {
  return formatDateTime(value, { fallback: '--' })
}

function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--'
  }
  return countFormatter.format(value)
}

function displayName(item: CommentItem): string {
  if (item.name && item.name.trim().length > 0) {
    return item.name
  }
  if (item.uid) {
    return `UID ${item.uid}`
  }
  return 'Anonymous'
}

async function submitComment(): Promise<void> {
  // 按钮在未登录、内容为空、提交中时已禁用，这里只是兜底
  if (!canSubmit.value) {
    return
  }
  isSubmitting.value = true
  try {
    // 扣积分的提示由 $fetch 层统一弹出
    await $fetch('/api/comments', {
      method: 'POST',
      body: {
        path: path.value,
        content: commentDraft.value.trim(),
      },
    })
    commentDraft.value = ''
    await refresh()
  }
  catch (error) {
    toast.error('评论提交失败', error)
  }
  finally {
    isSubmitting.value = false
  }
}

watch(path, () => {
  commentDraft.value = ''
})

onMounted(() => {
  isHydrated.value = true
})
</script>

<template>
  <!-- 评论栏：标题行 → 输入框 → 列表（列表自己滚）；评论之间只用一条细线分隔 -->
  <section class="flex h-full min-h-0 w-full flex-col">
    <div class="px-5 pb-3 pt-6">
      <p class="text-[13px] font-medium text-[var(--auxline-fg-2)]">
        评论<span v-if="total > 0" class="ml-1.5 font-normal text-[var(--auxline-fg-muted)]">{{ formatCount(total) }}</span>
      </p>
      <p class="mt-0.5 truncate text-xs text-[var(--auxline-fg-muted)]" :title="path">
        本页 {{ path }}
      </p>
    </div>
    <form
      class="flex flex-col gap-2 border-b border-[var(--auxline-line)] px-5 pb-4"
      @submit.prevent="submitComment"
    >
      <textarea
        v-model="commentDraft"
        :placeholder="inputPlaceholder"
        :maxlength="MAX_CONTENT_LENGTH"
        :disabled="!isLoggedIn || isSubmitting"
        rows="3"
        class="w-full resize-none rounded-lg border border-[var(--auxline-line-strong)] bg-[var(--auxline-bg)] px-3 py-2 text-[13px]
          text-[var(--auxline-fg)] outline-none transition-colors focus:border-[var(--auxline-fg-muted)] disabled:cursor-not-allowed disabled:opacity-60"
      />
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs text-[var(--auxline-fg-muted)]">
          {{ isLoggedIn ? `最多 ${MAX_CONTENT_LENGTH} 字` : '登录后可评论' }}
        </span>
        <AuxlineBtn
          type="submit"
          size="sm"
          variant="contrast"
          :loading="isSubmitting"
          :disabled="!canSubmit"
        >
          发送
        </AuxlineBtn>
      </div>
    </form>
    <div class="min-h-0 flex-1 overflow-y-auto">
      <template v-if="pending">
        <div
          v-for="index in skeletonRows"
          :key="`comment-skeleton-${index}`"
          class="flex flex-col gap-2 border-b border-[var(--auxline-line)] px-5 py-4"
        >
          <div class="flex items-center justify-between">
            <span class="h-3 w-20 rounded bg-[var(--auxline-bg-emphasis)]" />
            <span class="h-3 w-12 rounded bg-[var(--auxline-bg-emphasis)]" />
          </div>
          <span class="h-4 w-full rounded bg-[var(--auxline-bg-emphasis)]" />
        </div>
      </template>
      <template v-else>
        <article
          v-for="item in items"
          :key="item.id"
          class="flex flex-col gap-1.5 border-b border-[var(--auxline-line)] px-5 py-4"
        >
          <div class="flex items-baseline justify-between gap-2 text-xs">
            <span class="truncate text-[var(--auxline-fg-2)]">{{ displayName(item) }}</span>
            <span class="shrink-0 text-[var(--auxline-fg-muted)]">{{ formatDate(item.createdAt) }}</span>
          </div>
          <p v-if="item.content" class="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[var(--auxline-fg)]">
            {{ item.content }}
          </p>
          <p v-else class="text-xs text-[var(--auxline-fg-muted)]">
            --
          </p>
        </article>
        <p
          v-if="items.length === 0"
          class="px-5 py-10 text-center text-[13px] text-[var(--auxline-fg-muted)]"
        >
          暂无评论
        </p>
      </template>
      <p v-if="error" class="px-4 py-2 text-xs text-red-600">
        评论加载失败
      </p>
    </div>
  </section>
</template>
