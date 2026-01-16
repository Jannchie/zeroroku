<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { formatDateTime } from '~~/lib/formatDateTime'

type PixiModule = typeof import('pixi.js')
interface PixiAppInit {
  init: (options: Record<string, unknown>) => Promise<void>
}
type PixiRenderer = import('pixi.js').Renderer

type GlobalWindow = Window & {
  PIXI?: PixiModule
  Live2DCubismCore?: unknown
}

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasVisible = ref(false)
const logEnabled = ref(false)
const logLines = ref<string[]>([])
const modelPath = '/l2d/06-v2.1024/06-v2.model3.json'
const logToggleLabel = computed(() => (logEnabled.value ? '关闭日志' : '开启日志'))

useSeoMeta({
  title: '首页',
})

let app: import('pixi.js').Application | null = null
let live2dModel: import('@jannchie/pixi-live2d-display/cubism4').Live2DModel | null = null
let resizeHandler: (() => void) | null = null
let fadeTimer: ReturnType<typeof setTimeout> | null = null
let logSource: EventSource | null = null
let logFlushTimer: ReturnType<typeof setTimeout> | null = null
let disposed = false

const cubismCoreSrc = '/vendor/live2d/live2dcubismcore.min.js'
const canvasFadeDelay = 500
const maxLogLines = 32
const logLineLimit = maxLogLines
const logFlushInterval = 60
const logStreamUrl = '/api/logs/stream'
let cubismCorePromise: Promise<void> | null = null
const logBuffer: string[] = []

function resetLogState() {
  if (logFlushTimer) {
    globalThis.clearTimeout(logFlushTimer)
    logFlushTimer = null
  }
  logBuffer.length = 0
  logLines.value = []
}

async function loadCubismCore() {
  if (globalThis.window === undefined) {
    return
  }

  const globalWindow = globalThis as unknown as GlobalWindow
  if (globalWindow.Live2DCubismCore) {
    return
  }

  if (!cubismCorePromise) {
    cubismCorePromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${cubismCoreSrc}"]`,
      )

      if (existingScript) {
        if (existingScript.dataset.loaded === 'true') {
          resolve()
          return
        }

        existingScript.addEventListener('load', () => {
          existingScript.dataset.loaded = 'true'
          resolve()
        })
        existingScript.addEventListener('error', () => {
          reject(new Error(`Failed to load ${cubismCoreSrc}`))
        })
        return
      }

      const script = document.createElement('script')
      script.src = cubismCoreSrc
      script.async = true
      script.addEventListener('load', () => {
        script.dataset.loaded = 'true'
        resolve()
      })
      script.addEventListener('error', () => {
        reject(new Error(`Failed to load ${cubismCoreSrc}`))
      })
      document.head.append(script)
    })
  }

  await cubismCorePromise

  if (!globalWindow.Live2DCubismCore) {
    throw new Error('Live2DCubismCore is not available after loading the runtime.')
  }
}

function formatTimestamp(value: string) {
  return formatDateTime(value, { fallback: value })
}

function formatLogPayload(raw: string, eventType?: string) {
  let payload: unknown = raw
  try {
    payload = JSON.parse(raw)
  }
  catch {
    // Ignore malformed payloads.
  }

  if (typeof payload === 'string') {
    return payload
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const message = record.message ?? record.data ?? record.log ?? record.text
    if (typeof message === 'string' && message.length > 0) {
      return message
    }

    const parts: string[] = []
    if (eventType) {
      parts.push(`[${eventType}]`)
    }
    if (typeof record.timestamp === 'string' && record.timestamp.length > 0) {
      parts.push(formatTimestamp(record.timestamp))
    }
    if (typeof record.task_type === 'string' && record.task_type.length > 0) {
      parts.push(record.task_type)
    }
    const mid = record.mid
    if (typeof mid === 'number' || typeof mid === 'string') {
      parts.push(`mid=${mid}`)
    }
    if (typeof record.name === 'string' && record.name.length > 0) {
      parts.push(`name=${record.name}`)
    }
    if (parts.length > 0) {
      return parts.join(' ')
    }

    return JSON.stringify(record)
  }

  if (eventType) {
    return `[${eventType}] ${String(payload)}`
  }

  return String(payload)
}

function queueLogLines(lines: string[]) {
  if (lines.length === 0) {
    return
  }
  logBuffer.push(...lines)
  if (!logFlushTimer) {
    logFlushTimer = globalThis.setTimeout(flushLogBuffer, logFlushInterval)
  }
}

function flushLogBuffer() {
  logFlushTimer = null
  if (logBuffer.length === 0) {
    return
  }

  const nextLines = logLines.value
  nextLines.push(...logBuffer)
  logBuffer.length = 0
  if (nextLines.length > logLineLimit) {
    nextLines.splice(0, nextLines.length - logLineLimit)
  }
}

function appendLogLines(raw: string, eventType?: string) {
  const payload = formatLogPayload(raw, eventType)
  const lines = payload.split('\n').filter(line => line.trim().length > 0)
  queueLogLines(lines)
}

function connectLogStream() {
  if (!logEnabled.value || logSource || globalThis.EventSource === undefined) {
    return
  }

  logSource = new EventSource(logStreamUrl)
  logSource.addEventListener('message', (event) => {
    appendLogLines((event as MessageEvent<string>).data)
  })
  logSource.addEventListener('crawl', (event) => {
    appendLogLines((event as MessageEvent<string>).data, 'crawl')
  })
}

function disconnectLogStream() {
  logSource?.close()
  logSource = null
}

function toggleLogStream() {
  logEnabled.value = !logEnabled.value
}

watch(logEnabled, (enabled) => {
  if (enabled) {
    connectLogStream()
    return
  }
  disconnectLogStream()
  resetLogState()
})

function fitModel() {
  if (!app || !app.renderer || !live2dModel) {
    return
  }

  const { width, height } = app.renderer
  if (width === 0 || height === 0) {
    return
  }

  const bounds = live2dModel.getLocalBounds()
  if (bounds.width === 0 || bounds.height === 0) {
    return
  }

  const scale = Math.min(width / bounds.width, height / bounds.height) * 0.8

  live2dModel.pivot.set(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  live2dModel.scale.set(scale)
  live2dModel.position.set(width / 2, height / 2)
}

onMounted(async () => {
  if (!containerRef.value || !canvasRef.value) {
    return
  }

  canvasVisible.value = false

  try {
    await loadCubismCore()
  }
  catch (error) {
    console.error('Failed to load Live2D Cubism Core.', error)
    return
  }

  const [pixiModule, live2dModule] = await Promise.all([
    import('pixi.js'),
    import('@jannchie/pixi-live2d-display/cubism4'),
  ])
  const { Application, Ticker } = pixiModule
  const { Live2DModel } = live2dModule

  const globalWindow = globalThis as unknown as GlobalWindow
  globalWindow.PIXI = pixiModule
  Live2DModel.registerTicker(Ticker)

  if (disposed || !containerRef.value) {
    return
  }

  app = new Application()
  await (app as PixiAppInit).init({
    resizeTo: containerRef.value,
    canvas: canvasRef.value,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    backgroundAlpha: 0,
    powerPreference: 'high-performance',
    premultipliedAlpha: false,
  })

  if (disposed || !app.renderer) {
    app.destroy(true)
    app = null
    return
  }

  try {
    live2dModel = await Live2DModel.from(modelPath, {
      ticker: app.ticker,
    })
  }
  catch (error) {
    console.error('Failed to load Live2D model.', error)
    return
  }

  if (disposed || !app) {
    live2dModel.destroy({
      children: true,
      texture: true,
      baseTexture: true,
    })
    live2dModel = null
    return
  }

  live2dModel.setRenderer(app.renderer as PixiRenderer)
  app.stage.addChild(live2dModel)

  fitModel()
  resizeHandler = () => {
    fitModel()
  }
  window.addEventListener('resize', resizeHandler)

  fadeTimer = globalThis.setTimeout(() => {
    if (!disposed) {
      canvasVisible.value = true
    }
  }, canvasFadeDelay)
})

onBeforeUnmount(() => {
  disposed = true

  disconnectLogStream()
  resetLogState()

  if (fadeTimer) {
    globalThis.clearTimeout(fadeTimer)
    fadeTimer = null
  }

  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }

  if (live2dModel) {
    live2dModel.destroy({
      children: true,
      texture: true,
      baseTexture: true,
    })
    live2dModel = null
  }

  if (app) {
    app.destroy(true, {
      children: true,
      texture: true,
    })
    app = null
  }
})
</script>

<template>
  <div class="relative h-[70vh] w-full overflow-hidden">
    <div class="pointer-events-none absolute inset-0 z-0">
      <div v-if="logEnabled" class="w-full max-h-[46rem] overflow-hidden">
        <div class="flex flex-col gap-0 px-6 py-6 text-xs leading-5 text-zinc-500/50 font-mono uppercase">
          <div
            v-for="(line, index) in logLines"
            :key="`log-line-${index}`"
            class="whitespace-pre-wrap break-all"
          >
            {{ line }}
          </div>
        </div>
      </div>
    </div>
    <div class="absolute right-6 top-6 z-20">
      <AuxlineBtn
        size="xs"
        :variant="logEnabled ? 'contrast' : 'solid'"
        :aria-pressed="logEnabled"
        @click="toggleLogStream"
      >
        {{ logToggleLabel }}
      </AuxlineBtn>
    </div>
    <div ref="containerRef" class="relative z-10 h-full w-full">
      <canvas
        ref="canvasRef"
        class="block h-full w-full transition-opacity duration-500 ease-out"
        :class="canvasVisible ? 'opacity-100' : 'opacity-0'"
      />
    </div>
  </div>
</template>
