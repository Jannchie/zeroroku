function normalizeInternalPath(path: string): string {
  return path.startsWith('/') && !path.startsWith('//') ? path : '/me'
}

function withQuery(path: string, query: Record<string, string | null | undefined>): string {
  const url = new URL(path, 'http://localhost')
  for (const [key, value] of Object.entries(query)) {
    if (value) {
      url.searchParams.set(key, value)
    }
  }
  return `${url.pathname}${url.search}${url.hash}`
}

export function resolveRedirectPath(value: unknown, fallback = '/me'): string {
  if (typeof value !== 'string') {
    return fallback
  }
  return normalizeInternalPath(value)
}

export function toAbsoluteUrl(path: string): string {
  const origin = globalThis.window?.location.origin
  if (!origin) {
    return path
  }
  return new URL(path, origin).toString()
}

export function buildLoginPath(redirectPath: string, verified = false): string {
  return withQuery('/login', {
    redirect: normalizeInternalPath(redirectPath),
    verified: verified ? 'success' : undefined,
  })
}

export function buildVerifyEmailPath(email: string | null | undefined, redirectPath: string): string {
  return withQuery('/verify-email', {
    email: email?.trim().toLowerCase() || undefined,
    next: normalizeInternalPath(redirectPath),
  })
}

export function buildVerificationResultPath(redirectPath: string): string {
  return withQuery('/verify-email', {
    mode: 'complete',
    next: normalizeInternalPath(redirectPath),
  })
}

export function buildVerificationCallbackUrl(redirectPath: string): string {
  return toAbsoluteUrl(buildVerificationResultPath(redirectPath))
}
