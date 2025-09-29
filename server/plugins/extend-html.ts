export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event: _ }) => {
    html.head.push(`<script>
    var e =
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    t = localStorage.getItem('scheme') || 'auto'
    'dark' === t || (e && 'light' !== t)
      ? (document.documentElement.dataset.scheme = 'dark')
      : (document.documentElement.dataset.scheme = 'light')
  </script>`)
  })
})
