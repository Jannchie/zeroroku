<script setup lang="ts">
import { computed } from 'vue'
import { formatDateTimeFromDate } from '~~/lib/formatDateTime'

interface FansHistoryItem {
  createdAt: string | null
  fans: number | null
}

interface CalendarDay {
  key: string
  date: Date
  level: number
  sign: 'pos' | 'neg' | 'zero' | 'none'
  title: string
}

interface Thresholds {
  t1: number
  t2: number
  t3: number
}

interface TimePoint {
  ts: number
  fans: number
}

const props = withDefaults(defineProps<{
  items: FansHistoryItem[]
  weeks?: number
  loading?: boolean
}>(), {
  weeks: 53,
  loading: false,
})

const cellGap = 4
const weekStart = 0

const deltaFormatter = new Intl.NumberFormat('zh-CN', { signDisplay: 'exceptZero' })

function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function startOfWeek(date: Date, startDay: number): Date {
  const next = startOfDay(date)
  const day = next.getDay()
  const diff = (day - startDay + 7) % 7
  next.setDate(next.getDate() - diff)
  return next
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0')
}

function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function buildTitle(date: Date, delta: number | null, hasEntry: boolean): string {
  const dateLabel = formatDateTimeFromDate(date)
  if (!hasEntry || delta === null) {
    return `${dateLabel} · 无数据`
  }
  const deltaLabel = deltaFormatter.format(delta)
  return `${dateLabel} · 粉丝变化 ${deltaLabel}`
}

function computeThresholds(values: number[]): Thresholds | null {
  if (values.length === 0) {
    return null
  }
  const sorted = values.toSorted((a, b) => a - b)
  const pick = (ratio: number) => sorted[Math.floor((sorted.length - 1) * ratio)] ?? 0
  return {
    t1: pick(0.25),
    t2: pick(0.5),
    t3: pick(0.75),
  }
}

function getLevel(value: number, thresholds: Thresholds | null): number {
  if (!thresholds || value <= 0) {
    return 0
  }
  if (value <= thresholds.t1) {
    return 1
  }
  if (value <= thresholds.t2) {
    return 2
  }
  if (value <= thresholds.t3) {
    return 3
  }
  return 4
}

const parsedItems = computed(() => {
  const entries: TimePoint[] = []
  for (const item of props.items) {
    if (!item.createdAt) {
      continue
    }
    const parsed = Date.parse(item.createdAt)
    if (Number.isNaN(parsed)) {
      continue
    }
    if (!Number.isFinite(item.fans ?? Number.NaN)) {
      continue
    }
    entries.push({ ts: parsed, fans: Number(item.fans) })
  }
  entries.sort((a, b) => a.ts - b.ts)
  const deduped: TimePoint[] = []
  for (const entry of entries) {
    const last = deduped.at(-1)
    if (last && last.ts === entry.ts) {
      last.fans = entry.fans
      continue
    }
    deduped.push({ ...entry })
  }
  return deduped
})

const normalizedWeeks = computed(() => {
  const rawWeeks = props.weeks
  const value = typeof rawWeeks === 'number' && Number.isFinite(rawWeeks) ? Math.floor(rawWeeks) : 0
  if (value <= 0) {
    return 53
  }
  return Math.min(value, 60)
})

const calendarData = computed(() => {
  const weeks = normalizedWeeks.value
  const entries = parsedItems.value
  const deltaMap = new Map<string, number>()

  const latestDate = entries.length > 0 ? new Date(entries.at(-1)!.ts) : null
  const endDate = startOfDay(latestDate ?? new Date())
  const endWeekStart = startOfWeek(endDate, weekStart)
  const startDate = new Date(endWeekStart)
  startDate.setDate(endWeekStart.getDate() - (weeks - 1) * 7)

  let cursor = 0
  const valueAt = (targetTs: number): number | null => {
    while (cursor < entries.length && entries[cursor]!.ts < targetTs) {
      cursor += 1
    }
    if (cursor < entries.length && entries[cursor]!.ts === targetTs) {
      return entries[cursor]!.fans
    }
    const prev = cursor > 0 ? entries[cursor - 1] : null
    const next = cursor < entries.length ? entries[cursor] : null
    if (!prev || !next) {
      return null
    }
    const span = next.ts - prev.ts
    if (span <= 0) {
      return null
    }
    const ratio = (targetTs - prev.ts) / span
    return prev.fans + (next.fans - prev.fans) * ratio
  }

  const previousDay = new Date(startDate)
  previousDay.setDate(startDate.getDate() - 1)
  let previousValue = entries.length > 0 ? valueAt(previousDay.getTime()) : null

  if (entries.length > 0) {
    const totalDaysForDelta = weeks * 7
    for (let offset = 0; offset < totalDaysForDelta; offset += 1) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + offset)
      const currentValue = valueAt(date.getTime())
      if (currentValue !== null && previousValue !== null) {
        const delta = Math.round(currentValue - previousValue)
        deltaMap.set(toDayKey(date), delta)
      }
      previousValue = currentValue
    }
  }

  const deltaValues = [...deltaMap.values()]
    .map(value => Math.abs(value))
    .filter(value => value > 0)
  const deltaThresholds = computeThresholds(deltaValues)

  const days: CalendarDay[] = []
  const totalDays = weeks * 7
  for (let offset = 0; offset < totalDays; offset += 1) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + offset)
    const key = toDayKey(date)
    const hasEntry = deltaMap.has(key)
    const delta = hasEntry ? (deltaMap.get(key) ?? 0) : null
    const level = getLevel(delta === null ? 0 : Math.abs(delta), deltaThresholds)
    let sign: CalendarDay['sign']
    if (delta === null) {
      sign = 'none'
    }
    else if (delta > 0) {
      sign = 'pos'
    }
    else if (delta < 0) {
      sign = 'neg'
    }
    else {
      sign = 'zero'
    }
    days.push({
      key,
      date,
      level,
      sign,
      title: buildTitle(date, delta, hasEntry),
    })
  }

  return {
    weeks,
    days,
    hasData: entries.length > 0,
  }
})

const gridStyle = computed(() => ({
  '--weeks': String(calendarData.value.weeks),
  '--cell-gap': `${cellGap}px`,
}))
</script>

<template>
  <div class="heatmap-root flex flex-col gap-3 px-2 py-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
        粉丝日变化
      </span>
    </div>

    <div v-if="props.loading" class="flex min-h-[120px] items-center justify-center bg-[var(--auxline-bg-emphasis)]">
      <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
        加载中
      </span>
    </div>
    <div
      v-else-if="!calendarData.hasData"
      class="flex min-h-[120px] items-center justify-center bg-[var(--auxline-bg-emphasis)]"
    >
      <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
        暂无数据
      </span>
    </div>
    <div v-else class="heatmap-grid-wrapper">
      <div class="heatmap-grid" :style="gridStyle">
        <span
          v-for="day in calendarData.days"
          :key="day.key"
          class="heatmap-cell"
          :data-level="day.level"
          :data-sign="day.sign"
          :title="day.title"
          :aria-label="day.title"
          role="img"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.heatmap-grid-wrapper {
  overflow-x: hidden;
}

.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(var(--weeks), minmax(0, 1fr));
  grid-template-rows: repeat(7, auto);
  grid-auto-flow: column;
  gap: var(--cell-gap);
  width: 100%;
}

:global(.heatmap-root) {
  --heatmap-pos-1: #ffdbe9;
  --heatmap-pos-2: #ffc6de;
  --heatmap-pos-3: #ffb1d3;
  --heatmap-pos-4: #ff9cc8;
  --heatmap-neg-1: #e9f7f0;
  --heatmap-neg-2: #d8f0e5;
  --heatmap-neg-3: #c7e9da;
  --heatmap-neg-4: #b6e2cf;
}

:global([data-scheme='dark'] .heatmap-root) {
  --heatmap-pos-1: #332d30;
  --heatmap-pos-2: #41383c;
  --heatmap-pos-3: #4f4348;
  --heatmap-pos-4: #5d4e55;
  --heatmap-neg-1: #2c332f;
  --heatmap-neg-2: #37413a;
  --heatmap-neg-3: #414f46;
  --heatmap-neg-4: #4c5d52;
}

.heatmap-cell {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 2px;
  background-color: var(--auxline-bg-emphasis);
}

.heatmap-cell[data-sign='pos'][data-level='1'] {
  background-color: var(--heatmap-pos-1, #ffdbe9);
}

.heatmap-cell[data-sign='pos'][data-level='2'] {
  background-color: var(--heatmap-pos-2, #ffc6de);
}

.heatmap-cell[data-sign='pos'][data-level='3'] {
  background-color: var(--heatmap-pos-3, #ffb1d3);
}

.heatmap-cell[data-sign='pos'][data-level='4'] {
  background-color: var(--heatmap-pos-4, #ff9cc8);
}

.heatmap-cell[data-sign='neg'][data-level='1'] {
  background-color: var(--heatmap-neg-1, #e9f7f0);
}

.heatmap-cell[data-sign='neg'][data-level='2'] {
  background-color: var(--heatmap-neg-2, #d8f0e5);
}

.heatmap-cell[data-sign='neg'][data-level='3'] {
  background-color: var(--heatmap-neg-3, #c7e9da);
}

.heatmap-cell[data-sign='neg'][data-level='4'] {
  background-color: var(--heatmap-neg-4, #b6e2cf);
}
</style>
