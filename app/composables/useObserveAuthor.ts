import { OBSERVE_COST } from '~~/lib/credit'

// 把 UP 主加入观测队列；扣积分的提示由 $fetch 层统一弹出（见 plugins/credit-notice.client.ts）
export function useObserveAuthor() {
  const toast = useToast()
  const pending = ref(false)

  async function observe(mid: string): Promise<boolean> {
    if (pending.value) {
      return false
    }
    if (!/^\d+$/.test(mid)) {
      toast.show('MID 必须是数字', { tone: 'error' })
      return false
    }
    pending.value = true
    try {
      await $fetch(`/api/bilibili/author/${encodeURIComponent(mid)}/observe`, { method: 'POST' })
      return true
    }
    catch (error) {
      toast.error('观测失败', error)
      return false
    }
    finally {
      pending.value = false
    }
  }

  return { observe, pending, cost: OBSERVE_COST }
}
