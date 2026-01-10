import type { auth } from '~~/lib/auth'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/vue'

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
})
