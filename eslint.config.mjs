// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    'vue/multi-word-component-names': 'off',
    'vue/no-multiple-template-root': 'off',
    'no-irregular-whitespace': ['error', {
      skipTemplates: true,
      // skipStrings: true,
      // skipJSXText: true,
      // skipComments: true,
      // skipRegExps: true,
    }],
    'quotes': ['error', 'single'],
    'vue/html-quotes': ['error', 'single'],

  },
});
