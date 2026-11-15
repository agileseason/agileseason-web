import { MOCK_LABELS, MOCK_USERS } from '~/mocks/catalogs'
import { countTasks } from '~/utils/markdown'
import type { ApiBoard, ApiColumn, ApiIssue, BoardResponse } from '~/types/board'
import type { BoardApi } from '~/api/types'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Состояние хранится в памяти: перетаскивание и создание задач меняют «базу»,
// и повторная загрузка доски (кнопка «Обновить») показывает изменения.
// Сбрасывается при перезагрузке страницы.
// Любой id доски получает свою копию фикстуры mocks/board.json.
const boards = new Map<number, Promise<ApiBoard>>()

function getBoard(boardId: number): Promise<ApiBoard> {
  let board = boards.get(boardId)
  if (!board) {
    board = import('~/mocks/board.json').then(({ default: json }) => ({
      ...structuredClone((json as unknown as BoardResponse).data.board),
      id: boardId,
    }))
    boards.set(boardId, board)
  }
  return board
}

// Сортирует задачи колонки и перенумеровывает позиции с 1, как в API
function normalize(column: ApiColumn) {
  column.issues.sort((a, b) => a.position - b.position)
  column.issues.forEach((issue, index) => {
    issue.position = index + 1
  })
}

export const mockApi: BoardApi = {
  async fetchBoard(boardId) {
    await delay(400)
    return structuredClone(await getBoard(boardId))
  },

  async moveIssue({ issueId, columnId, position }) {
    await delay(100)
    for (const pending of boards.values()) {
      const board = await pending
      const source = board.columns.find(c => c.issues.some(i => i.id === issueId))
      if (!source) continue

      const target = board.columns.find(c => c.id === columnId)
      if (!target) throw new Error(`mock: колонка ${columnId} не найдена`)

      normalize(source)
      normalize(target)
      const index = source.issues.findIndex(i => i.id === issueId)
      const issue = source.issues.splice(index, 1)[0]
      if (!issue) return
      issue.columnId = columnId
      target.issues.splice(Math.max(0, position - 1), 0, issue)
      normalize(source)
      normalize(target)
      return
    }
    throw new Error(`mock: задача ${issueId} не найдена`)
  },

  async createIssue(params) {
    await delay(300)
    const board = await getBoard(params.boardId)
    const column = board.columns.find(c => c.id === params.columnId)
    if (!column) throw new Error(`mock: колонка ${params.columnId} не найдена`)
    const repository = board.repositories.find(r => r.id === params.repositoryId)
    if (!repository) throw new Error(`mock: репозиторий ${params.repositoryId} не найден`)

    const all = board.columns.flatMap(c => c.issues)
    const id = Math.max(0, ...all.map(i => i.id)) + 1
    const number = Math.max(
      0,
      ...all.filter(i => i.repositoryFullName === repository.fullName).map(i => i.number),
    ) + 1

    // как сервер: цвета меток и аватарки берём из справочников
    const issue: ApiIssue = {
      id,
      number,
      title: params.title,
      body: params.body ?? '',
      labels: (params.labels ?? []).map((name) => {
        const found = MOCK_LABELS.find(l => l.name === name)
        return { name, color: (found?.color ?? 'cccccc').replace('#', '') } // без '#', как в API
      }),
      assignees: (params.assignees ?? []).map((login) => {
        const found = MOCK_USERS.find(u => u.login === login)
        return { login, url: `https://github.com/${login}`, avatarUrl: found?.avatarUrl }
      }),
      color: params.color ?? null,
      isBody: !!params.body,
      isClosed: false,
      isArchived: false,
      totalSubtasks: 0,
      doneSubtasks: 0,
      position: 0,
      url: `https://github.com/${repository.fullName}/issues/${number}`,
      repositoryName: repository.name,
      repositoryFullName: repository.fullName,
      createdAt: new Date().toISOString(),
      createdAgo: 'less than a minute ago',
      author: { login: '' },
      columnId: column.id,
      commentsCount: 0,
      ageDays: 0,
      pullRequests: [],
    }

    normalize(column)
    if (params.position === 'top') column.issues.unshift(issue)
    else column.issues.push(issue)
    normalize(column)
    return structuredClone(issue)
  },

  async updateIssue({ issueId, title, body, assignees, labels, color }) {
    await delay(200)
    for (const pending of boards.values()) {
      const board = await pending
      const issue = board.columns.flatMap(c => c.issues).find(i => i.id === issueId)
      if (!issue) continue

      if (title !== undefined) issue.title = title
      if (body !== undefined) {
        issue.body = body
        issue.isBody = !!body
        const { done, total } = countTasks(body) // как сервер: подзадачи считаются по чекбоксам
        issue.totalSubtasks = total
        issue.doneSubtasks = done
      }
      if (assignees !== undefined) {
        issue.assignees = assignees.map((login) => {
          const found = MOCK_USERS.find(u => u.login === login)
          return { login, url: `https://github.com/${login}`, avatarUrl: found?.avatarUrl }
        })
      }
      if (labels !== undefined) {
        const current = issue.labels
        issue.labels = labels.map((name) => {
          const found = MOCK_LABELS.find(l => l.name === name)?.color
            ?? current.find(l => l.name === name)?.color
            ?? 'cccccc'
          return { name, color: found.replace('#', '') } // без '#', как в API
        })
      }
      if (color !== undefined) issue.color = color
      return
    }
    throw new Error(`mock: задача ${issueId} не найдена`)
  },

  async fetchAssignableUsers() {
    await delay(300)
    return MOCK_USERS
  },

  async fetchLabels() {
    await delay(300)
    return MOCK_LABELS
  },
}
