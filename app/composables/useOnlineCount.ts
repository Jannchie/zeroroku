import { onBeforeUnmount, onMounted, ref } from 'vue'

interface OnlineMessage {
  count: number
}

export function useOnlineCount() {
  const count = ref<number | null>(null)
  let source: EventSource | null = null

  const connect = () => {
    if (source || globalThis.EventSource === undefined) {
      return
    }
    source = new EventSource('/api/online')
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as OnlineMessage
        if (typeof payload.count === 'number' && Number.isFinite(payload.count)) {
          count.value = payload.count
        }
      }
      catch {
        // Ignore malformed payloads from transient network issues.
      }
    }
  }

  const disconnect = () => {
    source?.close()
    source = null
  }

  onMounted(connect)
  onBeforeUnmount(disconnect)

  return { count }
}
