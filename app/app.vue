<script setup lang="ts">
import { getData, setData } from 'nuxt-storage/local-storage';
import {
  IconMoon,
  IconSun,
  IconUserCircle,
  IconReceipt,
} from '@tabler/icons-vue'

const appConfig = useAppConfig();
const route = useRoute();
const { isMobile } = useDevice();
const isSignedIn = false; // NOTE: пока нет авторизации.

const navbarMenu = ref(null);
const navbarToggler = ref(null);
let closeAfterOpen = false;

// Theme START ---------------
const theme = computed(() => appConfig.theme.dark ? 'dark' : 'light');
const queryTheme = route.query.theme;

if (queryTheme && (queryTheme === 'light' || queryTheme === 'dark')) {
  appConfig.theme.dark = queryTheme === 'dark';
  setData('theme', queryTheme, 100, 'd');
} else {
  appConfig.theme.dark = getData('theme') === 'dark';
}

watch(
  () => route.query.theme,
  (queryTheme) => {
    if (queryTheme !== 'light' && queryTheme !== 'dark') return;

    appConfig.theme.dark = queryTheme === 'dark';
    setData('theme', queryTheme, 100, 'd');
  }
);

useHead({
  htmlAttrs: {
    'data-bs-theme': theme,
    'data-bs-theme-base': 'slate',
    'data-bs-theme-primary': 'indigo',
    'data-bs-theme-radius': '1.5',
  },
  bodyAttrs: {
    class: 'sticky-top', // 'layout-fluid',
  },
});
// Theme END ---------------


function closeMenu() {
  const el = navbarMenu.value;
  if (!isMobile.value || !el) return;

  // { toggle: false } не даёт Bootstrap открыть меню при первом создании экземпляра.
  const collapse = Collapse.getOrCreateInstance(el, { toggle: false });

  // Класс `collapsing` есть и при открытии, и при закрытии,
  // поэтому открытие определяем по aria-expanded на кнопке-переключателе.
  const isOpening =
    el.classList.contains('collapsing') &&
    navbarToggler.value?.getAttribute('aria-expanded') === 'true';

  if (el.classList.contains('show')) {
    collapse.hide();
  } else if (isOpening && !closeAfterOpen) {
    // Клик пришёлся на анимацию открытия: ждём её конца и закрываем
    closeAfterOpen = true;
    el.addEventListener(
      'shown.bs.collapse',
      () => {
        closeAfterOpen = false;
        collapse.hide();
      },
      { once: true }
    );
  }
}

function onMenuClick(event) {
  // Реагируем только на клик по ссылке, а не по пустому месту в меню
  if (event.target.closest('a')) {
    closeMenu();
  }
}

// Закрываем меню и при других переходах (например, кнопка «Назад»)
watch(() => route.fullPath, closeMenu)
</script>

<template>
  <div class='page'>
    <header class='navbar navbar-expand-md d-print-none bg-primary1'>
      <div class="container-fluid">
        <button
          ref='navbarToggler'
          class='navbar-toggler'
          type='button'
          data-bs-toggle='collapse'
          data-bs-target='#navbar-menu'
          aria-controls='navbar-menu'
          aria-expanded='false'
          aria-label='Toggle navigation'
        >
          <span class='navbar-toggler-icon' />
        </button>

        <NuxtLink to='/' title='appConfig.title' class='navbar-brand pe-0 pe-md-3'>
          {{ appConfig.title }}
        </NuxtLink>

        <div class='navbar-nav flex-row order-md-last'>
          <div class='d-flex'>
            <div class='nav-item me-2'>
              <NuxtLink
                v-tooltip='"Включить темный режим"'
                :to='{ path: route.path, query: { ...route.query, theme: "dark" } }'
                class='nav-link px-0 hide-theme-dark'
              >
                <IconMoon size='20' stroke-width='1' />
              </NuxtLink>
              <NuxtLink
                v-tooltip='"Включить светлый режим"'
                :to='{ path: route.path, query: { ...route.query, theme: "light" } }'
                class='nav-link px-0 hide-theme-light'
              >
                <IconSun size='20' stroke-width='1' />
              </NuxtLink>
            </div>
            <div class='nav-item'>
              <NuxtLink v-if='!isSignedIn' to='/' class='btn btn-outline-primary'>
                <IconUserCircle size='20' stroke-width='1' />
                <span class='ms-2 d-none d-xl-block'>Вход</span>
              </NuxtLink>
              <NuxtLink v-if='isSignedIn' to='/' class='nav-link'>
                <IconUserCircle stroke-width='1' />
              </NuxtLink>
            </div>
          </div>
        </div>

        <div
          id='navbar-menu'
          ref='navbarMenu'
          class='collapse navbar-collapse'
        >
          <ul class='navbar-nav' @click='onMenuClick'>
            <li class='nav-item'>
              <NuxtLink class='nav-link' to='/proto'>
                <IconReceipt size='20' stroke-width='1' />
                <span class='nav-link-title ms-1'>Proto</span>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </header>

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
