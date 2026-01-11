<script setup lang="ts">
import type uPlot from 'uplot'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import 'uplot/dist/uPlot.min.css'

interface FansHistoryItem {
  createdAt: string | null
  fans: number | null
}

const props = withDefaults(defineProps<{
  items: FansHistoryItem[]
  height?: number
  loading?: boolean
}>(), {
  height: 220,
  loading: false,
})

type SeriesData = [number[], (number | null)[]]

const container = ref<HTMLDivElement | null>(null)
const axisFont = '11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
const xAxisFormatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short' })

let chart: uPlot | null = null
let plotConstructor: typeof import('uplot') | null = null
let resizeObserver: ResizeObserver | null = null

function readPalette(target: HTMLElement) {
  const styles = getComputedStyle(target)
  const line = styles.getPropertyValue('--auxline-line').trim() || '#e6e6e6'
  const fg = styles.getPropertyValue('--auxline-fg').trim() || '#111111'
  const fgMuted = styles.getPropertyValue('--auxline-fg-muted').trim() || '#666666'
  const bg = styles.getPropertyValue('--auxline-bg').trim() || '#ffffff'
  return {
    line,
    fg,
    fgMuted,
    bg,
  }
}

const seriesData = computed<SeriesData | null>(() => {
  const points = props.items
    .map((item) => {
      if (!item.createdAt) {
        return null
      }
      const parsed = Date.parse(item.createdAt)
      if (Number.isNaN(parsed)) {
        return null
      }
      const fansValue = item.fans
      const fans = Number.isFinite(fansValue ?? Number.NaN) ? Number(fansValue) : null
      return {
        x: Math.floor(parsed / 1000),
        y: fans,
      }
    })
    .filter((point): point is { x: number, y: number | null } => point !== null)
    .toSorted((a, b) => a.x - b.x)

  if (points.length === 0) {
    return null
  }

  return [points.map(point => point.x), points.map(point => point.y)]
})

const hasData = computed(() => (seriesData.value?.[0].length ?? 0) > 0)

function buildOptions(
  width: number,
  height: number,
  palette: ReturnType<typeof readPalette>,
  pathBuilder?: uPlot.Series.PathBuilder,
) {
  const axisBase = {
    stroke: palette.fgMuted,
    font: axisFont,
    ticks: { show: false },
    border: { show: false },
  }

  return {
    width,
    height,
    class: 'auxline-uplot',
    pxAlign: false,
    padding: [8, 0, 4, 0],
    scales: {
      x: { time: true },
      y: { auto: true },
    },
    axes: [
      {
        ...axisBase,
        grid: { show: false },
        size: 24,
        gap: 2,
        values: (_: uPlot, splits: number[]) => splits.map(value => xAxisFormatter.format(new Date(value * 1000))),
      },
      {
        ...axisBase,
        size: 0,
        gap: 0,
        grid: { show: true, stroke: palette.line, width: 1 },
        values: (_: uPlot, splits: number[]) => splits.map(() => ''),
      },
    ],
    series: [
      {},
      {
        label: '粉丝总数',
        stroke: palette.fg,
        width: 1.5,
        cap: 'round',
        pxAlign: false,
        paths: pathBuilder,
        points: { show: false },
      },
    ],
    legend: { show: false },
    cursor: { show: false },
    select: { show: false },
  }
}

async function loadPlot(): Promise<typeof import('uplot') | null> {
  if (!import.meta.client) {
    return null
  }
  if (plotConstructor) {
    return plotConstructor
  }
  const module = await import('uplot')
  plotConstructor = (module as { default: typeof import('uplot') }).default
  return plotConstructor
}

function destroyPlot() {
  if (chart) {
    chart.destroy()
    chart = null
  }
}

async function renderPlot() {
  const target = container.value
  if (!target) {
    return
  }
  if (props.loading || !hasData.value || !seriesData.value) {
    destroyPlot()
    return
  }
  const UPlotCtor = await loadPlot()
  if (!UPlotCtor) {
    return
  }
  await nextTick()
  const width = target.clientWidth
  if (!width) {
    return
  }
  const palette = readPalette(target)
  const pathBuilder = UPlotCtor.paths.spline ? UPlotCtor.paths.spline() : undefined
  if (chart) {
    chart.setData(seriesData.value)
    chart.setSize({ width, height: props.height })
    return
  }
  chart = new UPlotCtor(buildOptions(width, props.height, palette, pathBuilder), seriesData.value, target)
}

function updateSize() {
  const target = container.value
  if (!chart || !target) {
    return
  }
  const width = target.clientWidth
  if (!width) {
    return
  }
  chart.setSize({ width, height: props.height })
}

onMounted(() => {
  if (container.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      updateSize()
    })
    resizeObserver.observe(container.value)
  }
  void renderPlot()
})

watch([seriesData, () => props.height, () => props.loading], () => {
  void renderPlot()
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  destroyPlot()
})
</script>

<template>
  <div class="relative w-full" :style="{ height: `${props.height}px` }">
    <div ref="container" class="h-full w-full" />
    <div
      v-if="props.loading"
      class="absolute inset-0 flex items-center justify-center bg-[var(--auxline-bg-emphasis)]"
    >
      <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
        加载中
      </span>
    </div>
    <div
      v-else-if="!hasData"
      class="absolute inset-0 flex items-center justify-center bg-[var(--auxline-bg-emphasis)]"
    >
      <span class="text-xs font-mono uppercase tracking-[0.12em] text-[var(--auxline-fg-muted)]">
        暂无数据
      </span>
    </div>
  </div>
</template>

<style scoped>
:global(.auxline-uplot) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  line-height: 1.2;
  width: 100%;
  max-width: 100%;
  color: var(--auxline-fg);
  background: var(--auxline-bg);
}

:global(.auxline-uplot .u-wrap) {
  width: 100%;
}
</style>
