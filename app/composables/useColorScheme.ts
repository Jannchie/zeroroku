import { onMounted } from 'vue'

export type ColorScheme = 'light' | 'dark' | 'auto'
export type ActiveScheme = 'light' | 'dark'

let isInitialized = false
let mediaQuery: MediaQueryList | null = null

function getWindow(): Window | undefined {
  if (globalThis.window === undefined) {
    return undefined
  }
  return globalThis.window
}

function getStoredScheme(): ColorScheme {
  const globalWindow = getWindow()
  if (!globalWindow) {
    return 'auto'
  }
  const stored = globalWindow.localStorage.getItem('scheme')
  if (stored === 'light' || stored === 'dark' || stored === 'auto') {
    return stored
  }
  return 'auto'
}

function getPreferredScheme(): ActiveScheme {
  const globalWindow = getWindow()
  if (!globalWindow) {
    return 'light'
  }
  const prefersDark = globalWindow.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  return prefersDark ? 'dark' : 'light'
}

export function useColorScheme() {
  const selectedScheme = useState<ColorScheme>('color-scheme-selected', () => 'auto')
  const activeScheme = useState<ActiveScheme>('color-scheme-active', () => 'light')

  function applyActiveScheme(nextScheme: ActiveScheme) {
    activeScheme.value = nextScheme
    if (globalThis.document !== undefined) {
      globalThis.document.documentElement.dataset.scheme = nextScheme
    }
  }

  function syncScheme(nextScheme: ColorScheme) {
    if (nextScheme === 'auto') {
      applyActiveScheme(getPreferredScheme())
      return
    }
    applyActiveScheme(nextScheme)
  }

  function setScheme(nextScheme: ColorScheme) {
    selectedScheme.value = nextScheme
    const globalWindow = getWindow()
    if (globalWindow) {
      globalWindow.localStorage.setItem('scheme', nextScheme)
    }
    syncScheme(nextScheme)
  }

  function toggleScheme() {
    setScheme(activeScheme.value === 'dark' ? 'light' : 'dark')
  }

  function handleMediaChange(event: MediaQueryListEvent) {
    if (selectedScheme.value !== 'auto') {
      return
    }
    applyActiveScheme(event.matches ? 'dark' : 'light')
  }

  function init() {
    const globalWindow = getWindow()
    if (isInitialized || !globalWindow) {
      return
    }
    isInitialized = true
    selectedScheme.value = getStoredScheme()
    syncScheme(selectedScheme.value)
    mediaQuery = globalWindow.matchMedia?.('(prefers-color-scheme: dark)') ?? null
    mediaQuery?.addEventListener('change', handleMediaChange)
  }

  onMounted(() => {
    init()
  })

  return {
    selectedScheme,
    activeScheme,
    setScheme,
    toggleScheme,
  }
}
