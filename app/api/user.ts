// app/api/user.ts
import { getApi } from '~/api/client'
import type { ApiCurrentUser } from '~/types/board'

export async function fetchCurrentUser(): Promise<ApiCurrentUser> {
  return (await getApi()).fetchCurrentUser()
}
