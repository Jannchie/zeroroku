// 全站轻提示：任何地方 useToast().show('…') / .error('…', error) 即可，由 app.vue 里的 <AuxlineToaster> 统一渲染
export type ToastTone = 'default' | 'success' | 'error'

export interface ToastItem {
  id: number
  title: string
  description?: string
  tone: ToastTone
}

interface ToastOptions {
  description?: string
  tone?: ToastTone
  duration?: number
}

const DEFAULT_DURATION = 4000
const MAX_TOASTS = 3
let nextId = 0
const timers = new Map<number, ReturnType<typeof setTimeout>>()

export function useToast() {
  const toasts = useState<ToastItem[]>('zr-toasts', () => [])

  function dismiss(id: number): void {
    clearTimeout(timers.get(id))
    timers.delete(id)
    if (toasts.value.some(item => item.id === id)) {
      toasts.value = toasts.value.filter(item => item.id !== id)
    }
  }

  function show(title: string, options: ToastOptions = {}): number {
    const id = ++nextId
    const next = [...toasts.value, { id, title, description: options.description, tone: options.tone ?? 'default' }]
    for (const dropped of next.slice(0, -MAX_TOASTS)) {
      dismiss(dropped.id)
    }
    toasts.value = next.slice(-MAX_TOASTS)
    if (import.meta.client) {
      timers.set(id, setTimeout(() => dismiss(id), options.duration ?? DEFAULT_DURATION))
    }
    return id
  }

  // 请求失败：标题说明哪件事失败，描述用服务端给的原因
  function error(title: string, cause: unknown): number {
    return show(title, { tone: 'error', description: getFetchErrorMessage(cause, '请稍后再试。') })
  }

  return { toasts, show, error, dismiss }
}
