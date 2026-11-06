// plugins/tabler.client.ts
import { defineNuxtPlugin } from '#app'
import { Tooltip, Collapse } from '@tabler/core/dist/js/tabler.min.js'

const DEFAULT_TOOLTIP_SHOW = 1000;
const DEFAULT_TOOLTIP_HIDE = 100;

export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.vueApp.directive('tooltip', {
    mounted(el, binding) {
      createTooltip(el, binding)
    },

    updated(el, binding) {
      if (binding.value !== binding.oldValue) {
        el._tooltip?.dispose()
        createTooltip(el, binding)
      }
    },

    unmounted(el) {
      try {
        el?._tooltip?.dispose?.()
      } catch (e) {
        // игнорируем ошибки Tabler при unmount race condition
      } finally {
        if (el) {
          el._tooltip = null
        }
      }
    }
  })
});

function createTooltip(el, binding) {
  const modifiers = binding.modifiers || {}
  const placement = binding.arg || 'auto'

  let title = ''
  if (typeof binding.value === 'string') {
    title = binding.value
  } else if (binding.value?.title) {
    title = binding.value.title
  }

  const options: any = { placement, title }

  if (modifiers.delay) {
    const d = binding.value?.delay
    if (typeof d === 'number') {
      options.delay = { show: d, hide: DEFAULT_TOOLTIP_HIDE }
    } else if (typeof d === 'object') {
      options.delay = {
        show: d.show ?? DEFAULT_TOOLTIP_SHOW,
        hide: d.hide ?? DEFAULT_TOOLTIP_HIDE,
      }
    }
  } else {
    options.delay = { show: DEFAULT_TOOLTIP_SHOW, hide: DEFAULT_TOOLTIP_HIDE }
  }

  el._tooltip = new Tooltip(el, options)
}
