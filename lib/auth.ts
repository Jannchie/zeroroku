import * as process from 'node:process'
import { compare, hash } from 'bcryptjs'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../server/index'
import { sendResetPasswordEmail } from '../server/utils/auth-email'
import * as schema from './database/schema'

const githubClientId = process.env.GITHUB_CLIENT_ID
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET
const betterAuthBaseUrl = process.env.BETTER_AUTH_URL
  ?? process.env.NUXT_PUBLIC_SITE_URL
  ?? 'http://localhost:6066'
const extraTrustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

function toOriginOrNull(value: string): string | null {
  try {
    return new URL(value).origin
  }
  catch {
    return null
  }
}

const trustedOrigins = [
  toOriginOrNull(betterAuthBaseUrl),
  ...extraTrustedOrigins,
  ...(process.env.NODE_ENV === 'production'
    ? []
    : [
        'http://localhost:6066',
        'http://127.0.0.1:6066',
      ]),
].filter((origin): origin is string => Boolean(origin))

if (!githubClientId || !githubClientSecret) {
  throw new Error('Missing GitHub OAuth credentials.')
}

export const auth = betterAuth({
  baseURL: betterAuthBaseUrl,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  rateLimit: {
    enabled: true,
  },
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    password: {
      hash: async password => hash(password, 10),
      verify: async ({ hash: hashValue, password }) => compare(password, hashValue),
    },
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url)
    },
  },
  user: {
    additionalFields: {
      exp: {
        type: 'number',
        defaultValue: 0,
        input: false,
      },
      credit: {
        type: 'number',
        defaultValue: 0,
        input: false,
      },
    },
  },
  socialProviders: {
    github: {
      clientId: githubClientId,
      clientSecret: githubClientSecret,
    },
  },
})
