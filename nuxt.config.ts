// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: [
    '@tabler/core/dist/css/tabler.min.css',
    '~/assets/css/tabler-overrides.css',
  ],
  ssr: false, // true
})
