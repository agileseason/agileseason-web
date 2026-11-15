// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  runtimeConfig: {
    public: {
      // mock — данные из ~/mocks, бэкенд не нужен; real — GraphQL-бэкенд.
      // В dev по умолчанию mock, в production — real. Переопределяется NUXT_PUBLIC_API_MODE.
      apiMode: (process.env.NODE_ENV === 'production' ? 'real' : 'mock') as 'mock' | 'real',
      // Полный URL GraphQL endpoint (нужен для real). Переопределяется NUXT_PUBLIC_API_URL.
      apiUrl: '',
    },
  },
  modules: [
    '@nuxt/eslint',
  ],
  css: [
    '@tabler/core/dist/css/tabler.min.css',
    '@tabler/core/dist/css/tabler-themes.min.css',
    '~/assets/css/tabler-overrides.css',
  ],
  app: {
    head: {
      style: [
        {
          innerHTML: `
            html[data-bs-theme="dark"] { color-scheme: dark; background-color: #182433; }
            html[data-bs-theme="light"] { color-scheme: light; background-color: #fff; }
          `,
        },
      ],
      script: [
        {
          // Выполняется синхронно, до первой отрисовки.
          innerHTML: `
            (function () {
              try {
                var m = document.cookie.match(/(?:^|; )theme=([^;]*)/);
                var t = m ? decodeURIComponent(m[1]) : null;
                var q = new URLSearchParams(location.search).get('theme');
                if (q === 'light' || q === 'dark') t = q;
                document.documentElement.setAttribute('data-bs-theme', t === 'dark' ? 'dark' : 'light');
              } catch (e) {}
            })();
          `,
          tagPosition: 'head',
        },
      ],
    },
  },
});
