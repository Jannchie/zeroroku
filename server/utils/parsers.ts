const MIN_UNSIGNED_BIGINT = BigInt(0)
const MAX_SIGNED_BIGINT = BigInt('9223372036854775807')

export function parseNumberOrNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? null : parsed
}

export function parseNumberOrZero(value: string | number | null | undefined): number {
  return parseNumberOrNull(value) ?? 0
}

export function parseUnsignedBigInt(value: string | null | undefined): bigint | null {
  if (!value) {
    return null
  }
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) {
    return null
  }

  let numeric: bigint
  try {
    numeric = BigInt(trimmed)
  }
  catch {
    return null
  }

  if (numeric < MIN_UNSIGNED_BIGINT || numeric > MAX_SIGNED_BIGINT) {
    return null
  }

  return numeric
}

export function toText(value: string | number | null): string {
  if (value === null) {
    return ''
  }
  return String(value)
}
