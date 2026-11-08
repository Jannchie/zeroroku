// 积分变动的统一回执：会改积分的接口都在响应里带上 creditChange，
// 前端 plugins/credit-notice.client.ts 在 $fetch 层统一识别并弹提示、刷新积分，调用方无需关心
export interface CreditChange {
  // 变动原因，同积分流水里的 text，如「登录」「评论」「观测」
  reason: string
  creditDelta: number
  expDelta: number
  // 变动后的余额
  credit: number
  exp: number
}

export const OBSERVE_COST = 10
