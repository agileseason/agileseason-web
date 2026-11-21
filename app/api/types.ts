// app/api/types.ts
import type { ApiBoard, ApiCurrentUser, ApiIssue } from '~/types/board'

export interface AssignableUser {
  login: string
  avatarUrl: string
}

export interface GithubLabel {
  name: string
  color: string // hex без '#'
  description: string
}

export interface MoveIssueParams {
  issueId: number
  columnId: number
  position: number // с 1, как в API
}

// Изменяются только переданные поля. assignees и labels передаются целиком (полная замена).
export interface UpdateIssueParams {
  issueId: number
  title?: string
  body?: string // markdown
  assignees?: string[] // логины
  labels?: string[] // названия меток
  color?: string | null // null — сбросить цвет
}

export interface CreateIssueParams {
  boardId: number
  columnId: number
  repositoryId: number // репозиторий, в котором создаётся issue (один из board.repositories)
  title: string
  body?: string
  position?: string // 'top' — в начало колонки
  assignees?: string[] // логины
  labels?: string[] // названия меток
  color?: string
}

export interface CreateIssueResponse {
  data: { createIssue: { issue: ApiIssue | null, errors: string[] } }
}

// Контракт API. Его реализуют и http (реальный бэкенд), и mock:
// если добавить метод в интерфейс, TypeScript потребует обе реализации.
export interface BoardApi {
  fetchCurrentUser(): Promise<ApiCurrentUser>
  fetchBoard(boardId: number): Promise<ApiBoard>
  moveIssue(params: MoveIssueParams): Promise<void>
  createIssue(params: CreateIssueParams): Promise<ApiIssue>
  updateIssue(params: UpdateIssueParams): Promise<void>
  fetchAssignableUsers(boardId: number, repositoryFullName: string): Promise<AssignableUser[]>
  fetchLabels(boardId: number, repositoryFullName: string): Promise<GithubLabel[]>
}
