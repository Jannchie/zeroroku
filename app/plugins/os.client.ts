export default defineNuxtPlugin(() => {
  const navigatorWithUserAgentData = navigator as Navigator & {
    userAgentData?: {
      platform?: string
    }
  }
  const platform = navigatorWithUserAgentData.userAgentData?.platform ?? navigator.platform ?? ''
  const userAgent = navigator.userAgent ?? ''
  const isWindows = /win/i.test(platform) || /windows/i.test(userAgent)

  if (isWindows) {
    document.documentElement.classList.add('is-windows')
  }
})
