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
      const statusCode = typeof typedError.statusCode === 'number' ? typedError.statusCode : 500
      if (statusCode === 403) {
        throw createError({
          statusCode,
          statusMessage: '邮箱尚未验证，我们已重新发送验证邮件。',
          data: {
            email,
          },
        })
      }
      if (statusCode === 401) {
        throw createError({
          statusCode,
          statusMessage: '邮箱或密码错误。',
        })
      }
      throw createError({
        statusCode,
        statusMessage: typedError.body?.message ?? '登录失败。',
      })
    }
    throw error
  }
})
