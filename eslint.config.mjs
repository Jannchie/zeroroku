import jannchie from '@jannchie/eslint-config'
// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  jannchie({
    formatters: true,
  }),
  // Your custom configs here
)
