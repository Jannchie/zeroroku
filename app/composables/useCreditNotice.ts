import type { CreditChange } from '~~/lib/credit'
import { authClient } from '~~/lib/client'

const signedFormatter = new Intl.NumberFormat('zh-CN', { signDisplay: 'exceptZero' })
const numberFormatter = new Intl.NumberFormat('zh-CN')

// 积分变动提示：「评论 −1 积分」+「经验 +1 · 当前 N 积分」，并刷新会话里的积分
// 一般不用直接调：plugins/credit-notice.client.ts 会在 $fetch 层自动调用
export function useCreditNotice() {
  const toast = useToast()

  function notifyCreditChange(change: CreditChange): void {
    const meta = change.expDelta === 0 ? [] : [`经验 ${signedFormatter.format(change.expDelta)}`]
    meta.push(`当前 ${numberFormatter.format(change.credit)} 积分`)
    toast.show(`${change.reason} ${signedFormatter.format(change.creditDelta)} 积分`, {
      tone: change.creditDelta >= 0 ? 'success' : 'default',
      description: meta.join(' · '),
    })
    authClient.$store.notify('$sessionSignal')
  }

  return { notifyCreditChange }
}
