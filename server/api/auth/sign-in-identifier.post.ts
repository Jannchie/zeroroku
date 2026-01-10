import { eq } from 'drizzle-orm'
import { auth } from '~~/lib/auth'
import { user } from '~~/lib/database/auth-schema'
import { db } from '~~/server/index'

interface SignInIdentifierBody {
  identifier?: string
  password?: string
}

interface SignInError {
  statusCode?: number
  body?: {
    message?: string
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SignInIdentifierBody>(event)
  const identifier = body.identifier?.trim()
  const password = body.password ?? ''

  if (!identifier || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing credentials.',
    })
  }

  let email = identifier
  if (!identifier.includes('@')) {
    const matches = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.name, identifier))
      .limit(1)
    const record = matches[0]

    if (!record) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid email or password.',
      })
    }

    email = record.email
  }

  try {
    const result = await auth.api.signInEmail({
      body: {
        email,
        password,
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
      const typedError = error as SignInError
      const statusCode = typeof typedError.statusCode === 'number' ? typedError.statusCode : 500
      const message = typedError.body?.message ?? 'Sign in failed.'

      throw createError({
        statusCode,
        statusMessage: message,
      })
    }
    throw error
  }
})
