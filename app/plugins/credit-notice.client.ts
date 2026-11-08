import type { CreditChange } from '~~/lib/credit'

function isCreditChange(value: unknown): value is CreditChange {
  return Boolean(value) && typeof value === 'object'
    && typeof (value as CreditChange).creditDelta === 'number'
    && typeof (value as CreditChange).credit === 'number'
}

// 「积分有变动就弹提示」在 $fetch 层统一实现：任何响应里带 creditChange（见 lib/credit.ts）都会提示并刷新积分，
// 新增改积分的接口只要照约定返回即可，调用方什么都不用做
export default defineNuxtPlugin(() => {
  const { notifyCreditChange } = useCreditNotice()
  globalThis.$fetch = $fetch.create({
    onResponse({ response }) {
      const change = (response._data as { creditChange?: unknown } | undefined)?.creditChange
      if (isCreditChange(change)) {
        notifyCreditChange(change)
      }
    },
  })
})
