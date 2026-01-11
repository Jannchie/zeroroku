import { onMounted } from 'vue'

export type ColorScheme = 'light' | 'dark' | 'auto'
export type ActiveScheme = 'light' | 'dark'

let isInitialized = false
let mediaQuery: MediaQueryList | null = null

function getStoredScheme(): ColorScheme {
  if (typeof window === 'undefined') {
    return 'auto'
  }
  const stored = window.localStorage.getItem('scheme')
  if (stored === 'light' || stored === 'dark' || stored === 'auto') {
    return stored
  }
  return 'auto'
}

function getPreferredScheme(): ActiveScheme {
  if (typeof window === 'undefined') {
    return 'light'
  }
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  return prefersDark ? 'dark' : 'light'
}

export function useColorScheme() {
  const selectedScheme = useState<ColorScheme>('color-scheme-selected', () => 'auto')
  const activeScheme = useState<ActiveScheme>('color-scheme-active', () => 'light')

  function applyActiveScheme(nextScheme: ActiveScheme) {
    activeScheme.value = nextScheme
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.scheme = nextScheme
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
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('scheme', nextScheme)
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
    if (isInitialized || typeof window === 'undefined') {
      return
    }
    isInitialized = true
    selectedScheme.value = getStoredScheme()
    syncScheme(selectedScheme.value)
    mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)') ?? null
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
