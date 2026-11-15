import { getApi } from '~/api/client'
import type { ApiBoard, ApiIssue } from '~/types/board'
import type { CreateIssueParams, MoveIssueParams } from '~/api/types'

export type { CreateIssueParams, CreateIssueResponse } from '~/api/types'

export async function fetchBoard(boardId: number): Promise<ApiBoard> {
  return (await getApi()).fetchBoard(boardId)
}

export async function moveIssue(params: MoveIssueParams): Promise<void> {
  return (await getApi()).moveIssue(params)
}

export async function createIssue(params: CreateIssueParams): Promise<ApiIssue> {
  return (await getApi()).createIssue(params)
}

