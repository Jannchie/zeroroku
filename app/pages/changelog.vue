<script setup lang="ts">
import { computed } from 'vue'
import { parse } from 'yaml'

interface ChangelogEntry {
  type: string
  text: string
}

interface ChangelogItem {
  date: string
  version: string
  summary?: string
  entries: ChangelogEntry[]
}

interface RawChangelogEntry {
  type?: string
  text?: string
}

interface RawChangelogItem {
  date?: string
  version?: string
  summary?: string
  entries?: RawChangelogEntry[]
}

interface RawChangelogDoc {
  changelog?: RawChangelogItem[]
}

useSeoMeta({
  title: '更新日志',
})

const { data, pending, error } = useAsyncData<string>('changelog', async () => {
  if (import.meta.server) {
    const { readFile } = await import('node:fs/promises')
    const { join } = await import('node:path')
    return await readFile(join(process.cwd(), 'public', 'changelog.yaml'), 'utf8')
  }
  return await $fetch<string>('/changelog.yaml', { responseType: 'text' })
}, {
  default: () => '',
})

function normalizeEntry(entry: RawChangelogEntry): ChangelogEntry {
  return {
    type: entry.type ?? 'info',
    text: entry.text ?? '',
  }
}

function normalizeItem(item: RawChangelogItem): ChangelogItem {
  const entries = Array.isArray(item.entries)
    ? item.entries.map(normalizeEntry).filter((entry) => entry.text.length > 0)
    : []
  return {
    date: item.date ?? '',
    version: item.version ?? '',
    summary: item.summary,
    entries,
  }
}

function parseChangelog(source: string): { items: ChangelogItem[]; error: boolean } {
  if (!source) {
    return { items: [], error: false }
  }
  try {
    const parsed = parse(source) as RawChangelogDoc
    if (!parsed?.changelog || !Array.isArray(parsed.changelog)) {
      return { items: [], error: false }
    }
    const items = parsed.changelog.map(normalizeItem).filter((item) => {
      return item.date.length > 0 || item.version.length > 0 || Boolean(item.summary) || item.entries.length > 0
    })
    return { items, error: false }
  }
  catch (parseError) {
    console.error('Failed to parse changelog YAML.', parseError)
    return { items: [], error: true }
  }
}

const parseResult = computed(() => parseChangelog(data.value ?? ''))
const changelogItems = computed(() => parseResult.value.items)
const hasEntries = computed(() => changelogItems.value.length > 0)
const parseFailed = computed(() => parseResult.value.error)

const entryIcons: Record<string, string> = {
  added: 'i-heroicons-plus-circle-20-solid',
  changed: 'i-heroicons-arrow-path-20-solid',
  fixed: 'i-heroicons-wrench-screwdriver-20-solid',
  removed: 'i-heroicons-minus-circle-20-solid',
  deprecated: 'i-heroicons-exclamation-triangle-20-solid',
  security: 'i-heroicons-shield-check-20-solid',
  新增: 'i-heroicons-plus-circle-20-solid',
  变更: 'i-heroicons-arrow-path-20-solid',
  修复: 'i-heroicons-wrench-screwdriver-20-solid',
  移除: 'i-heroicons-minus-circle-20-solid',
  弃用: 'i-heroicons-exclamation-triangle-20-solid',
  安全: 'i-heroicons-shield-check-20-solid',
}

const entryLabels: Record<string, string> = {
  added: '新增',
  changed: '变更',
  fixed: '修复',
  removed: '移除',
  deprecated: '弃用',
  security: '安全',
  新增: '新增',
  变更: '变更',
  修复: '修复',
  移除: '移除',
  弃用: '弃用',
  安全: '安全',
}

function entryIcon(type: string): string {
  return entryIcons[type] ?? 'i-heroicons-sparkles-20-solid'
}

function entryLabel(type: string): string {
  return entryLabels[type] ?? type
}
</script>

<template>
  <section class="flex flex-col items-center">
    <AuxlinePageHeader
      title="更新日志"
      subtitle="站点更新记录"
    />
    <div class="w-full max-w-3xl border-[var(--auxline-line)] sm:border-x">
      <div class="flex items-center justify-between border-b border-[var(--auxline-line)]">
        <p class="px-2 text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
          更新记录
        </p>
        <AuxlineBtn to="/" size="sm">
          返回主页面
        </AuxlineBtn>
      </div>
      <article class="flex flex-col gap-6 px-4 py-6 text-sm leading-7">
        <p
          v-if="pending"
          class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
        >
          正在加载更新日志
        </p>
        <p
          v-else-if="error"
          class="text-xs font-mono uppercase tracking-[0.12em] text-red-600"
        >
          更新日志加载失败
        </p>
        <p
          v-else-if="parseFailed"
          class="text-xs font-mono uppercase tracking-[0.12em] text-red-600"
        >
          更新日志解析失败
        </p>
        <p
          v-else-if="!hasEntries"
          class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
        >
          暂无更新
        </p>
        <div v-else class="flex flex-col gap-6">
          <section
            v-for="item in changelogItems"
            :key="`${item.date}-${item.version}`"
            class="flex flex-col gap-3 border-b border-[var(--auxline-line)] pb-4 last:border-b-0 last:pb-0"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
                  {{ item.date || '未注明日期' }}
                </span>
                <span
                  v-if="item.version"
                  class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
                >
                  v{{ item.version }}
                </span>
              </div>
              <span
                v-if="item.summary"
                class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
              >
                {{ item.summary }}
              </span>
            </div>
            <ul v-if="item.entries.length > 0" class="flex flex-col gap-2">
              <li
                v-for="(entry, index) in item.entries"
                :key="`${item.date}-${item.version}-${index}`"
                class="flex flex-wrap items-center gap-3"
              >
                <span class="flex items-center gap-2 min-w-[4rem] text-[0.6rem] font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
                  <span class="text-base" :class="entryIcon(entry.type)" aria-hidden="true" />
                  <span>{{ entryLabel(entry.type) }}</span>
                </span>
                <span class="flex-1 min-w-[12rem]">
                  {{ entry.text }}
                </span>
              </li>
            </ul>
            <p
              v-else
              class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]"
            >
              暂无记录
            </p>
          </section>
        </div>
      </article>
    </div>
  </section>
</template>
