// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  devServer: { port: 6066 },
  modules: [
    '@nuxt/image',
    '@nuxt/icon',
    '@nuxt/fonts',
    '@nuxt/eslint',
    '@nuxtjs/seo',
    '@unocss/nuxt',
  ],
  app: {
    head: {
      title: 'ZeroRoku',
      titleTemplate: '%s | ZeroRoku',
    },
  },
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:6066',
    name: 'ZeroRoku',
    description: 'ZeroRoku',
  },
  eslint: {
    config: {
      standalone: false,
    },
  },
})
