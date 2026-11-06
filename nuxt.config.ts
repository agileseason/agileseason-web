// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  css: [
    '@tabler/core/dist/css/tabler.min.css',
    '@tabler/core/dist/css/tabler-themes.min.css',
    '~/assets/css/tabler-overrides.css',
  ],
})
