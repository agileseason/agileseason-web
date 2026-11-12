// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
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
