import { getApi } from '~/api/client'
import type { AssignableUser } from '~/api/types'

export type { AssignableUser } from '~/api/types'

export async function fetchAssignableUsers(
  boardId: number,
  repositoryFullName: string,
): Promise<AssignableUser[]> {
  return (await getApi()).fetchAssignableUsers(boardId, repositoryFullName)
}

