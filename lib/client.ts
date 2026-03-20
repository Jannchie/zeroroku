import { inferAdditionalFields } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/vue'

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        exp: {
          type: 'number',
        },
        credit: {
          type: 'number',
        },
      },
    }),
  ],
})

export type AuthSession = typeof authClient.$Infer.Session
export type AuthSessionUser = AuthSession['user']
