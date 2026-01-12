<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { authClient } from '~~/lib/client'

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
  title?: string
  pathLabel?: string
  noteLabel?: string
  emptyLabel?: string
  errorLabel?: string
  placeholderLabel?: string
  placeholderLoggedOutLabel?: string
  loginHintLabel?: string
  maxLengthLabel?: string
  submitLabel?: string
  unauthenticatedLabel?: string
  emptyContentLabel?: string
  submitFailedLabel?: string
  limit?: number
}>(), {
  title: 'Comments',
  pathLabel: 'Path',
  noteLabel: 'Read-only for now',
  emptyLabel: 'No comments yet',
  errorLabel: 'Failed to load comments',
  placeholderLabel: 'Write a comment...',
  placeholderLoggedOutLabel: 'Sign in to comment',
  loginHintLabel: 'Sign in to comment',
  maxLengthLabel: 'Max {max} chars',
  submitLabel: 'Send',
  unauthenticatedLabel: 'Please sign in.',
  emptyContentLabel: 'Comment cannot be empty.',
  submitFailedLabel: 'Failed to submit comment.',
  limit: 30,
})

const MAX_CONTENT_LENGTH = 500
const MAX_LIMIT = 100

const route = useRoute()
const session = authClient.useSession()
const path = computed(() => route.path || '/')
const isLoggedIn = computed(() => Boolean(session.value?.data?.user))

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
const submitError = ref<string | null>(null)
const isSubmitting = ref(false)
const canSubmit = computed(() => {
  return isLoggedIn.value && commentDraft.value.trim().length > 0 && !isSubmitting.value
})
const inputPlaceholder = computed(() => {
  return isLoggedIn.value ? props.placeholderLabel : props.placeholderLoggedOutLabel
})
const maxLengthHint = computed(() => {
  return props.maxLengthLabel.replace('{max}', String(MAX_CONTENT_LENGTH))
})

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const countFormatter = new Intl.NumberFormat('zh-CN')
const skeletonRows = Array.from({ length: 8 }, (_, index) => index)

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '--'
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return dateFormatter.format(parsed)
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
  if (isSubmitting.value) {
    return
  }
  submitError.value = null

  if (!isLoggedIn.value) {
    submitError.value = props.unauthenticatedLabel
    return
  }

  const trimmed = commentDraft.value.trim()
  if (!trimmed) {
    submitError.value = props.emptyContentLabel
    return
  }

  isSubmitting.value = true
  try {
    await $fetch('/api/comments', {
      method: 'POST',
      body: {
        path: path.value,
        content: trimmed,
      },
    })
    commentDraft.value = ''
    await refresh()
  }
  catch (error) {
    if (error && typeof error === 'object' && 'data' in error) {
      const maybeData = error.data as { message?: string, statusMessage?: string }
      submitError.value = maybeData.message ?? maybeData.statusMessage ?? props.submitFailedLabel
      return
    }
    submitError.value = props.submitFailedLabel
  }
  finally {
    isSubmitting.value = false
  }
}

watch(path, () => {
  commentDraft.value = ''
  submitError.value = null
})
</script>

<template>
  <section class="flex flex-col w-full max-h-[calc(100vh-8rem)] border-b border-[var(--auxline-line)] pb-8">
    <form
      class="border-b border-[var(--auxline-line)] px-2 py-2 flex flex-col gap-2"
      @submit.prevent="submitComment"
    >
      <textarea
        v-model="commentDraft"
        :placeholder="inputPlaceholder"
        :maxlength="MAX_CONTENT_LENGTH"
        :disabled="!isLoggedIn || isSubmitting"
        rows="3"
        class="w-full resize-none border border-[var(--auxline-line)] bg-[var(--auxline-bg-emphasis)] px-2 py-2 text-sm
          text-[var(--auxline-fg)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--auxline-line)]"
      />
      <div class="flex items-center justify-between text-[0.6rem] font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
        <span>
          {{ isLoggedIn ? maxLengthHint : props.loginHintLabel }}
        </span>
        <AuxlineBtn
          type="submit"
          size="sm"
          :loading="isSubmitting"
          :disabled="!canSubmit"
        >
          {{ props.submitLabel }}
        </AuxlineBtn>
      </div>
      <p v-if="submitError" class="text-[0.65rem] text-red-600">
        {{ submitError }}
      </p>
    </form>
    <div
      class="flex items-center justify-between gap-2 border-b border-[var(--auxline-line)] px-2 py-2 text-[0.6rem]
        font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
    >
      <span>{{ props.title }}</span>
      <span v-if="total > 0">{{ formatCount(total) }}</span>
    </div>
    <div
      class="flex items-center gap-2 border-b border-[var(--auxline-line)] px-2 py-2 text-[0.6rem]
        font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
    >
      <span class="shrink-0">{{ props.pathLabel }}</span>
      <span class="truncate">{{ path }}</span>
    </div>
    <div
      v-if="props.noteLabel"
      class="border-b border-[var(--auxline-line)] px-2 py-2 text-[0.65rem]
        font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
    >
      {{ props.noteLabel }}
    </div>
    <div class="flex-1 min-h-0 overflow-y-auto">
      <template v-if="pending">
        <div
          v-for="index in skeletonRows"
          :key="`comment-skeleton-${index}`"
          class="flex flex-col gap-2 border-b border-[var(--auxline-line)] px-2 py-2 last:border-b-0"
        >
          <div class="flex items-center justify-between">
            <span class="h-3 w-20 bg-[var(--auxline-bg-emphasis)]" />
            <span class="h-3 w-12 bg-[var(--auxline-bg-emphasis)]" />
          </div>
          <span class="h-4 w-full bg-[var(--auxline-bg-emphasis)]" />
          <span class="h-3 w-16 bg-[var(--auxline-bg-emphasis)]" />
        </div>
      </template>
      <template v-else>
        <div
          v-for="item in items"
          :key="item.id"
          class="flex flex-col gap-2 border-b border-[var(--auxline-line)] px-2 py-2 last:border-b-0"
        >
          <div class="flex items-center justify-between text-[0.6rem] font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
            <span class="truncate">{{ displayName(item) }}</span>
            <span class="shrink-0">{{ formatDate(item.createdAt) }}</span>
          </div>
          <p v-if="item.content" class="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {{ item.content }}
          </p>
          <p v-else class="text-[0.65rem] text-[var(--auxline-fg-muted)]">
            --
          </p>
          <div class="flex items-center gap-3 text-[0.6rem] font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
            <span>LIKE {{ formatCount(item.likes) }}</span>
            <span>DISLIKE {{ formatCount(item.dislikes) }}</span>
          </div>
        </div>
        <div
          v-if="items.length === 0"
          class="px-2 py-3 text-[0.65rem] font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
        >
          {{ props.emptyLabel }}
        </div>
      </template>
      <p v-if="error" class="px-2 py-2 text-[0.65rem] text-red-600">
        {{ props.errorLabel }}
      </p>
    </div>
  </section>
</template>
