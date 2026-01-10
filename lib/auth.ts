import * as process from 'node:process'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createFieldAttribute } from 'better-auth/db'
import { compare, hash } from 'bcryptjs'
import { db } from '../server/index'
import * as schema from './database/schema'

const githubClientId = process.env.GITHUB_CLIENT_ID
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET

if (!githubClientId || !githubClientSecret) {
  throw new Error('Missing GitHub OAuth credentials.')
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash: async (password) => hash(password, 10),
      verify: async ({ hash: hashValue, password }) => compare(password, hashValue),
    },
  },
  user: {
    additionalFields: {
      exp: createFieldAttribute('number', { defaultValue: 0, input: false }),
      credit: createFieldAttribute('number', { defaultValue: 0, input: false }),
    },
  },
  socialProviders: {
    github: {
      clientId: githubClientId,
      clientSecret: githubClientSecret,
    },
  },
})
