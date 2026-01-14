function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatDateTimeFromDate(date: Date): string {
  const year = date.getFullYear()
  const month = pad2(date.getMonth() + 1)
  const day = pad2(date.getDate())
  const hours = pad2(date.getHours())
  const minutes = pad2(date.getMinutes())
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

export interface FormatDateTimeOptions {
  fallback?: string
  useRawOnInvalid?: boolean
}

export function formatDateTime(
  value: string | Date | null | undefined,
  options: FormatDateTimeOptions = {},
): string {
  const fallback = options.fallback ?? '--'
  const useRawOnInvalid = options.useRawOnInvalid ?? true
  if (!value) {
    return fallback
  }
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' && useRawOnInvalid ? value : fallback
  }
  return formatDateTimeFromDate(date)
}

export function formatDateTimeFromUnixSeconds(value: number, fallback = '--'): string {
  if (!Number.isFinite(value)) {
    return fallback
  }
  const date = new Date(value * 1000)
  if (Number.isNaN(date.getTime())) {
    return fallback
  }
  return formatDateTimeFromDate(date)
}
