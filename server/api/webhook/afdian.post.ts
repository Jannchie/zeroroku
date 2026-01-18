import type { AnyPgTable } from 'drizzle-orm/pg-core'
import { Buffer } from 'node:buffer'
import { createVerify } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { readBody } from 'h3'
import { sponsors } from '~~/lib/database/auth-schema'
import { db } from '~~/server/index'

interface WebhookResponse {
  ec: number
  em: string
}

const PAID_STATUS = 2
const AFDIAN_WEBHOOK_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwwdaCg1Bt+UKZKs0R54y
lYnuANma49IpgoOwNmk3a0rhg/PQuhUJ0EOZSowIC44l0K3+fqGns3Ygi4AfmEfS
4EKbdk1ahSxu7Zkp2rHMt+R9GarQFQkwSS/5x1dYiHNVMiR8oIXDgjmvxuNes2Cr
8fw9dEF0xNBKdkKgG2qAawcN1nZrdyaKWtPVT9m2Hl0ddOO9thZmVLFOb9NVzgYf
jEgI+KWX6aY19Ka/ghv/L4t1IXmz9pctablN5S0CRWpJW3Cn0k6zSXgjVdKm4uN7
jRlgSRaf/Ind46vMCm3N2sgwxu/g3bnooW+db0iLo13zzuvyn727Q3UDQ0MmZcEW
MQIDAQAB
-----END PUBLIC KEY-----`

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseText(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return null
}

function parseMoneyToCents(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value * 100) : null
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    const match = trimmed.match(/^(-)?(\d+)(?:\.(\d+))?$/)
    if (!match) {
      return null
    }
    const sign = match[1] ? -1 : 1
    const whole = Number(match[2])
    if (!Number.isFinite(whole)) {
      return null
    }
    const fractionSource = match[3] ?? ''
    const fraction = Number(fractionSource.slice(0, 2).padEnd(2, '0') || '0')
    if (!Number.isFinite(fraction)) {
      return null
    }
    return sign * (whole * 100 + fraction)
  }
  return null
}

function parseInteger(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : null
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!/^-?\d+$/.test(trimmed)) {
      return null
    }
    const parsed = Number.parseInt(trimmed, 10)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const millis = value > 10_000_000_000 ? value : value * 1000
    const parsed = new Date(millis)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    if (/^\d+$/.test(trimmed)) {
      const numeric = Number.parseInt(trimmed, 10)
      if (Number.isFinite(numeric)) {
        return parseDate(numeric)
      }
    }
    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

function normalizeBody(body: unknown): Record<string, unknown> | null {
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as unknown
      return isRecord(parsed) ? parsed : null
    }
    catch {
      return null
    }
  }
  if (!isRecord(body)) {
    return null
  }
  const dataValue = body.data
  if (typeof dataValue === 'string') {
    try {
      const parsed = JSON.parse(dataValue) as unknown
      if (isRecord(parsed)) {
        return { ...body, data: parsed }
      }
    }
    catch {
      return body
    }
  }
  return body
}

function resolveOrderId(order: Record<string, unknown>): string | null {
  return parseText(order.out_trade_no)
    ?? parseText(order.trade_no)
    ?? parseText(order.order_id)
    ?? null
}

function resolveOrderSign(body: Record<string, unknown>, data: Record<string, unknown>, order: Record<string, unknown>): string | null {
  return parseText(order.sign) ?? parseText(data.sign) ?? parseText(body.sign)
}

function buildOrderSignString(order: Record<string, unknown>): string | null {
  const outTradeNo = parseText(order.out_trade_no)
  const userId = parseText(order.user_id)
  const planId = parseText(order.plan_id)
  const totalAmount = parseText(order.total_amount)
  if (!outTradeNo || !userId || !planId || !totalAmount) {
    return null
  }
  return `${outTradeNo}${userId}${planId}${totalAmount}`
}

function resolveUserName(order: Record<string, unknown>): string {
  return parseText(order.user_name) ?? parseText(order.user_id) ?? ''
}

function resolveAmountCents(order: Record<string, unknown>): number | null {
  const showAmount = parseMoneyToCents(order.show_amount)
  if (showAmount !== null) {
    return showAmount
  }
  return parseMoneyToCents(order.total_amount)
}

function resolveSponsoredAt(order: Record<string, unknown>): Date {
  const candidate = parseDate(order.created_at)
    ?? parseDate(order.create_time)
    ?? parseDate(order.created_time)
    ?? parseDate(order.pay_time)
    ?? parseDate(order.paid_at)
  return candidate ?? new Date()
}

function getTableIdentifier(table: AnyPgTable) {
  const config = getTableConfig(table)
  const schemaName = config.schema ?? 'public'
  return sql`${sql.identifier(schemaName)}.${sql.identifier(config.name)}`
}

function verifyOrderSignature(signStr: string, sign: string): boolean {
  try {
    const verifier = createVerify('RSA-SHA256')
    verifier.update(signStr)
    verifier.end()
    const signature = Buffer.from(sign, 'base64')
    return verifier.verify(AFDIAN_WEBHOOK_PUBLIC_KEY, signature)
  }
  catch {
    return false
  }
}

export default defineEventHandler(async (event): Promise<WebhookResponse> => {
  try {
    const rawBody = await readBody(event)
    const body = normalizeBody(rawBody)
    if (!body) {
      return { ec: 400, em: '无效的请求体。' }
    }

    const dataValue = body.data
    if (!isRecord(dataValue)) {
      return { ec: 400, em: '缺少 data。' }
    }

    const dataType = parseText(dataValue.type)
    if (dataType !== 'order') {
      return { ec: 200, em: 'ok' }
    }

    const orderValue = dataValue.order
    if (!isRecord(orderValue)) {
      return { ec: 400, em: '缺少 order。' }
    }

    const signStr = buildOrderSignString(orderValue)
    const sign = resolveOrderSign(body, dataValue, orderValue)
    if (!signStr || !sign || !verifyOrderSignature(signStr, sign)) {
      return { ec: 401, em: '签名校验失败。' }
    }

    const status = parseInteger(orderValue.status)
    const orderId = resolveOrderId(orderValue)
    if (!orderId) {
      return { ec: 400, em: '缺少订单号。' }
    }

    if (status !== PAID_STATUS) {
      return { ec: 200, em: 'ok' }
    }

    const amountCents = resolveAmountCents(orderValue)
    if (amountCents === null) {
      return { ec: 400, em: '缺少金额。' }
    }

    const userName = resolveUserName(orderValue)
    const sponsoredAt = resolveSponsoredAt(orderValue)
    const sponsorsTable = getTableIdentifier(sponsors)

    await db.execute(sql`
      insert into ${sponsorsTable} (order_id, user_name, sponsored_at, amount)
      values (${orderId}, ${userName}, ${sponsoredAt}, ${amountCents})
      on conflict (order_id) do update
      set
        user_name = excluded.user_name,
        sponsored_at = excluded.sponsored_at,
        amount = excluded.amount
    `)

    return { ec: 200, em: 'ok' }
  }
  catch {
    return { ec: 500, em: '服务器内部错误。' }
  }
})
