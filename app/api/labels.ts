import { getApi } from '~/api/client'
import type { GithubLabel } from '~/api/types'

export type { GithubLabel } from '~/api/types'

export async function fetchLabels(
  boardId: number,
  repositoryFullName: string,
): Promise<GithubLabel[]> {
  return (await getApi()).fetchLabels(boardId, repositoryFullName)
}

