// 从 $fetch 抛出的错误里取服务端给的提示文案，取不到就用 fallback
export function getFetchErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = error.data as { message?: string, statusMessage?: string } | null
    return data?.statusMessage ?? data?.message ?? fallback
  }
  return fallback
}
