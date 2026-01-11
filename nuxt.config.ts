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
  image: {
    provider: 'ipx',
    domains: [
      'i0.hdslb.com',
      'i1.hdslb.com',
      'i2.hdslb.com',
      'i3.hdslb.com',
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
    ],
  },
  app: {
    head: {
      title: 'ZeroRoku',
      titleTemplate: '%s | ZeroRoku',
      link: [
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: '/light-icon.svg',
          media: '(prefers-color-scheme: light)',
        },
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: '/dark-icon.svg',
          media: '(prefers-color-scheme: dark)',
        },
      ],
    },
  },
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL ?? 'https://zeroroku.com',
    name: 'ZeroRoku',
    description: 'ZeroRoku',
  },
  eslint: {
    config: {
      standalone: false,
    },
  },
})
