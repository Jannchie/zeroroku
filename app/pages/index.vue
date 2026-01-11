<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

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
const modelPath = '/l2d/06-v2.1024/06-v2.model3.json'

let app: import('pixi.js').Application | null = null
let live2dModel: import('@jannchie/pixi-live2d-display/cubism4').Live2DModel | null = null
let resizeHandler: (() => void) | null = null
let fadeTimer: ReturnType<typeof setTimeout> | null = null
let disposed = false

const cubismCoreSrc = '/vendor/live2d/live2dcubismcore.min.js'
const canvasFadeDelay = 500
let cubismCorePromise: Promise<void> | null = null

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
  resizeHandler = () => fitModel()
  window.addEventListener('resize', resizeHandler)

  fadeTimer = globalThis.setTimeout(() => {
    if (!disposed) {
      canvasVisible.value = true
    }
  }, canvasFadeDelay)
})

onBeforeUnmount(() => {
  disposed = true

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
  <div class="h-[70vh] w-full overflow-hidden">
    <div ref="containerRef" class="h-full w-full">
      <canvas
        ref="canvasRef"
        class="block h-full w-full transition-opacity duration-500 ease-out"
        :class="canvasVisible ? 'opacity-100' : 'opacity-0'"
      />
    </div>
  </div>
</template>
