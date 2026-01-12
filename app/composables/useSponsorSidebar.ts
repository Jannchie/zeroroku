import { onMounted } from 'vue'

const storageKey = 'show-sponsors-sidebar'
let isInitialized = false

function getWindow(): Window | undefined {
  if (globalThis.window === undefined) {
    return undefined
  }
  return globalThis.window
}

function getStoredPreference(): boolean {
  const globalWindow = getWindow()
  if (!globalWindow) {
    return true
  }
  const stored = globalWindow.localStorage.getItem(storageKey)
  if (stored === '0' || stored === 'false') {
    return false
  }
  if (stored === '1' || stored === 'true') {
    return true
  }
  return true
}

export function useSponsorSidebar() {
  const showSponsorsSidebar = useState<boolean>('show-sponsors-sidebar', () => true)

  function setShowSponsorsSidebar(nextValue: boolean) {
    showSponsorsSidebar.value = nextValue
    const globalWindow = getWindow()
    if (globalWindow) {
      globalWindow.localStorage.setItem(storageKey, nextValue ? '1' : '0')
    }
  }

  function init() {
    const globalWindow = getWindow()
    if (isInitialized || !globalWindow) {
      return
    }
    isInitialized = true
    showSponsorsSidebar.value = getStoredPreference()
  }

  onMounted(() => {
    init()
  })

  return {
    showSponsorsSidebar,
    setShowSponsorsSidebar,
  }
}
