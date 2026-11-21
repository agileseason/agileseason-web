// app/composables/useCurrentUser.ts
import { fetchCurrentUser } from '~/api/user'

// Текущий пользователь и его доски. Запрос выполняется один раз и
// переиспользуется всеми компонентами (общий ключ), поэтому можно вызывать где угодно.
export function useCurrentUser() {
  return useLazyAsyncData('current-user', () => fetchCurrentUser())
}

