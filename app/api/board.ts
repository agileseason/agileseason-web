import boardMock from '~/mocks/board.json'
import type { ApiBoard, ApiIssue, BoardResponse } from '~/types/board'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Сейчас данные берутся из мока, имитируем сетевую задержку.
// Когда будет готов GraphQL — заменить тело функции на реальный запрос,
// сигнатуру менять не нужно.
export async function fetchBoard(boardId: number): Promise<ApiBoard> {
  await delay(400)
  console.debug('fetchBoard (mock)', boardId)
  return (boardMock as unknown as BoardResponse).data.board
}

// Заглушка под мутацию перемещения карточки
export async function moveIssue(params: {
  issueId: number
  columnId: number
  position: number // с 1, как в API
}): Promise<void> {
  await delay(100)
  console.debug('moveIssue (mock)', params)
}

// ---------- создание issue ----------
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

const ISSUE_FIELDS = `
  id number title body
  labels { name color }
  assignees { login url avatarUrl }
  color isBody isClosed isArchived totalSubtasks doneSubtasks
  position url repositoryName repositoryFullName createdAt createdAgo
  author { login url avatarUrl }
  columnId commentsCount ageDays
  pullRequests {
    id number isClosed isMerged url repositoryName
    assignees { login avatarUrl }
  }
`

export const CREATE_ISSUE_MUTATION = `
  mutation(
    $boardId:Int!,
    $columnId:Int!,
    $repositoryId:Int!,
    $title:String!,
    $body:String,
    $position:String,
    $assignees:[String!],
    $labels:[String!],
    $color:String
  ) {
    createIssue(input: {
      boardId: $boardId,
      columnId: $columnId,
      repositoryId: $repositoryId,
      title: $title,
      body: $body,
      position: $position,
      assignees: $assignees,
      labels: $labels,
      color: $color
    }) {
      issue { ${ISSUE_FIELDS} }
      errors
    }
  }
`

// Сейчас возвращается мок в формате реального ответа.
// Для настоящего запроса заменить тело на:
//   const res = await <ваш graphql-клиент>(CREATE_ISSUE_MUTATION, params)  // variables = params
//   const { issue, errors } = (res as CreateIssueResponse).data.createIssue
//   if (errors?.length || !issue) throw new Error(errors?.join(', ') || 'createIssue failed')
//   return issue
export async function createIssue(params: CreateIssueParams): Promise<ApiIssue> {
  await delay(300)
  console.debug('createIssue (mock)', params)

  const repository = (boardMock as unknown as BoardResponse).data.board.repositories
    .find(r => r.id === params.repositoryId)
  const id = Date.now()
  const number = id % 100000
  const fullName = repository?.fullName ?? ''

  return {
    id,
    number,
    title: params.title,
    body: params.body ?? '',
    labels: (params.labels ?? []).map(name => ({ name, color: 'cccccc' })),
    assignees: (params.assignees ?? []).map(login => ({ login })),
    color: params.color ?? null,
    isBody: !!params.body,
    isClosed: false,
    isArchived: false,
    totalSubtasks: 0,
    doneSubtasks: 0,
    position: 0,
    url: `https://github.com/${fullName}/issues/${number}`,
    repositoryName: repository?.name ?? '',
    repositoryFullName: fullName,
    createdAt: new Date().toISOString(),
    createdAgo: 'less than a minute ago',
    author: { login: '' },
    columnId: params.columnId,
    commentsCount: 0,
    ageDays: 0,
    pullRequests: [],
  }
}
