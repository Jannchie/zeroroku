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

interface ParseResult {
  items: ChangelogItem[]
  error: boolean
}

useSeoMeta({
  title: '更新日志',
})

const { data, pending, error } = useAsyncData<string>('changelog', async () => {
  if (import.meta.server) {
    const { readFile } = await import('node:fs/promises')
    const { default: path } = await import('node:path')
    return await readFile(path.join(process.cwd(), 'public', 'changelog.yaml'), 'utf8')
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
    ? item.entries.map(entry => normalizeEntry(entry)).filter(entry => entry.text.length > 0)
    : []
  return {
    date: item.date ?? '',
    version: item.version ?? '',
    summary: item.summary,
    entries,
  }
}

function parseChangelog(source: string): ParseResult {
  if (!source) {
    return { items: [], error: false }
  }
  try {
    const parsed = parse(source) as RawChangelogDoc
    if (!parsed?.changelog || !Array.isArray(parsed.changelog)) {
      return { items: [], error: false }
    }
    const items = parsed.changelog.map(item => normalizeItem(item)).filter((item) => {
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
</script>

<template>
  <section class="flex w-full flex-col">
    <AuxlinePageHeader
      title="更新日志"
      subtitle="站点更新记录"
    />
    <p v-if="pending" class="zr-section text-[13px] text-[var(--auxline-fg-muted)]">
      正在加载更新日志
    </p>
    <p v-else-if="error" class="zr-section text-[13px] text-red-600">
      更新日志加载失败
    </p>
    <p v-else-if="parseFailed" class="zr-section text-[13px] text-red-600">
      更新日志解析失败
    </p>
    <p v-else-if="!hasEntries" class="zr-section text-[13px] text-[var(--auxline-fg-muted)]">
      暂无更新
    </p>
    <!-- 每个版本一行：左边版本号与日期，右边条目；条目类型是一枚小标签 -->
    <template v-else>
      <section
        v-for="item in changelogItems"
        :key="`${item.date}-${item.version}`"
        class="grid grid-cols-1 gap-3 border-b border-[var(--auxline-line)] px-[var(--zr-gutter)] py-6 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-8"
      >
        <div class="flex flex-row items-baseline gap-3 sm:flex-col sm:gap-1">
          <span v-if="item.version" class="text-[15px] font-semibold">v{{ item.version }}</span>
          <span class="text-xs text-[var(--auxline-fg-muted)]">{{ item.date || '未注明日期' }}</span>
        </div>
        <div class="flex min-w-0 max-w-3xl flex-col gap-3">
          <p v-if="item.summary" class="text-sm font-medium">
            {{ item.summary }}
          </p>
          <ul v-if="item.entries.length > 0" class="m-0 flex list-none flex-col gap-2 p-0">
            <li
              v-for="(entry, index) in item.entries"
              :key="`${item.date}-${item.version}-${index}`"
              class="flex items-start gap-3 text-[13px] leading-relaxed text-[var(--auxline-fg-2)]"
            >
              <span class="zr-tag mt-0.5">{{ entry.type }}</span>
              <span class="min-w-0 flex-1">{{ entry.text }}</span>
            </li>
          </ul>
          <p v-else class="text-xs text-[var(--auxline-fg-muted)]">
            暂无记录
          </p>
        </div>
      </section>
    </template>
  </section>
</template>
