import { authClient } from '~~/lib/client'

export default defineNuxtRouteMiddleware(async (to) => {
  const { data, error } = await authClient.useSession(useFetch)

  if (error.value || !data.value?.user) {
    const redirectTarget = encodeURIComponent(to.fullPath)
    return navigateTo(`/login?redirect=${redirectTarget}`)
  }
})
