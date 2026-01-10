import jannchie from '@jannchie/eslint-config'
import tsParser from '@typescript-eslint/parser'
// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // Your custom configs here
  jannchie(),
  {
    ignores: ['drizzle/**'],
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
      },
    },
  },
)
