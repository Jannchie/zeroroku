import { auth } from '~~/lib/auth'
import { enforcePasswordResetRateLimit } from '~~/server/utils/auth-rate-limit'

interface RequestPasswordResetBody {
  email?: string
  redirectTo?: string
}

interface AuthApiError {
  statusCode?: number
  body?: {
    message?: string
  }
}

const RESET_PASSWORD_SUCCESS_RESPONSE = {
  status: true,
  message: 'If this email exists in our system, check your email for the reset link',
}

export default defineEventHandler(async (event) => {
  const body = await readBody<RequestPasswordResetBody>(event)
  const email = body.email?.trim().toLowerCase()

  if (!email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid email.',
    })
  }

  const { emailCoolingDown } = await enforcePasswordResetRateLimit(event, email)
  if (emailCoolingDown) {
    return RESET_PASSWORD_SUCCESS_RESPONSE
  }

  try {
    return await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: body.redirectTo,
      },
      headers: event.headers,
      request: toWebRequest(event),
    })
  }
  catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const typedError = error as AuthApiError
      throw createError({
        statusCode: typeof typedError.statusCode === 'number' ? typedError.statusCode : 500,
        statusMessage: typedError.body?.message ?? 'Reset password failed.',
      })
    }
    throw error
  }
})
