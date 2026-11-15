interface GraphQLResponse<T> {
  data?: T
  errors?: { message: string }[]
}

// Минимальный GraphQL-клиент для режима real.
// TODO: авторизация (заголовки / cookie), когда она появится на бэкенде.
export async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const { apiUrl } = useRuntimeConfig().public
  if (!apiUrl) throw new Error('Не задан NUXT_PUBLIC_API_URL (адрес GraphQL endpoint)')

  const res = await $fetch<GraphQLResponse<T>>(apiUrl, {
    method: 'POST',
    body: { query, variables },
  })
  if (res.errors?.length) throw new Error(res.errors.map(e => e.message).join(', '))
  if (!res.data) throw new Error('Пустой ответ GraphQL')
  return res.data
}
