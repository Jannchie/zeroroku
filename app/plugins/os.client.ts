export default defineNuxtPlugin(() => {
  const platform = navigator.userAgentData?.platform ?? navigator.platform ?? ''
  const userAgent = navigator.userAgent ?? ''
  const isWindows = /win/i.test(platform) || /windows/i.test(userAgent)

  if (isWindows) {
    document.documentElement.classList.add('is-windows')
  }
})
