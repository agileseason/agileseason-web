import type { BoardApi } from '~/api/types'

let instance: Promise<BoardApi> | undefined

// Выбирает реализацию API по NUXT_PUBLIC_API_MODE (mock | real).
// Реализации подгружаются динамически: в режиме real код и фикстуры mock не грузятся.
// Читаем runtimeConfig из обработчиков событий — это работает, пока ssr: false.
export function getApi(): Promise<BoardApi> {
  if (!instance) {
    const mode = useRuntimeConfig().public.apiMode
    if (mode === 'mock') {
      console.info('[api] режим mock: данные из ~/mocks, бэкенд не используется')
      instance = import('~/mocks/api').then(m => m.mockApi)
    } else if (mode === 'real') {
      instance = import('~/api/http').then(m => m.httpApi)
    } else {
      throw new Error(`Неизвестный NUXT_PUBLIC_API_MODE: "${mode}" (ожидается mock или real)`)
    }
  }
  return instance
}
