import { auth } from '~~/lib/auth'
import { enforceSignInRateLimit } from '~~/server/utils/auth-rate-limit'

interface SignInEmailBody {
  email?: string
  password?: string
  callbackURL?: string
  rememberMe?: boolean
}

interface AuthApiError {
  statusCode?: number
  body?: {
    message?: string
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SignInEmailBody>(event)
  const email = body.email?.trim().toLowerCase()

  await enforceSignInRateLimit(event, email)

  try {
    const result = await auth.api.signInEmail({
      body: {
        email: email ?? '',
        password: body.password ?? '',
        callbackURL: body.callbackURL,
        rememberMe: body.rememberMe,
      },
      headers: event.headers,
      request: toWebRequest(event),
      returnHeaders: true,
      returnStatus: true,
    })

    const headerBag = result.headers as Headers & { getSetCookie?: () => string[] }
    const setCookieHeader = typeof headerBag.getSetCookie === 'function'
      ? headerBag.getSetCookie()
      : headerBag.get('set-cookie')
    if (setCookieHeader) {
      setHeader(event, 'set-cookie', setCookieHeader)
    }

    setResponseStatus(event, result.status)
    return result.response
  }
  catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const typedError = error as AuthApiError
      throw createError({
        statusCode: typeof typedError.statusCode === 'number' ? typedError.statusCode : 500,
        statusMessage: typedError.body?.message ?? 'Sign in failed.',
      })
    }
    throw error
  }
})
