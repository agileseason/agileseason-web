import { gql } from '~/api/graphql'
import type { ApiBoard } from '~/types/board'
import type { BoardApi, AssignableUser, CreateIssueResponse, GithubLabel } from '~/api/types'

// ---------- запросы ----------
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

// ВНИМАНИЕ: поля выведены из типа ApiBoard, а имя корневого поля `board(id:)`
// и тип аргумента — предположение. Сверить со схемой бэкенда.
const BOARD_QUERY = `
  query($id:Int!) {
    board(id: $id) {
      id name isOwner cacheKey
      repositories { id name fullName }
      columns {
        id name position isAutoAssign isAutoClose
        issues { ${ISSUE_FIELDS} }
      }
    }
  }
`

const CREATE_ISSUE_MUTATION = `
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

const ASSIGNABLE_USERS_QUERY = `
  query($boardId:Int!, $repositoryFullName:String!) {
    items:githubAssignableUsers(boardId: $boardId, repositoryFullName: $repositoryFullName) {
      login
      avatarUrl
    }
  }
`

const LABELS_QUERY = `
  query($boardId:Int!, $repositoryFullName:String!) {
    items:githubLabels(boardId: $boardId, repositoryFullName: $repositoryFullName) {
      name
      color
      description
    }
  }
`

// ---------- реализация ----------
export const httpApi: BoardApi = {
  async fetchBoard(boardId) {
    const data = await gql<{ board: ApiBoard }>(BOARD_QUERY, { id: boardId })
    return data.board
  },

  async moveIssue() {
    // TODO: описать мутацию перемещения, когда она появится в API
    throw new Error('moveIssue: мутация перемещения ещё не реализована на бэкенде')
  },

  async updateIssue() {
    // TODO: описать мутацию обновления, когда она появится в API
    throw new Error('updateIssue: мутация обновления ещё не реализована на бэкенде')
  },

  async createIssue(params) {
    const data = await gql<CreateIssueResponse['data']>(CREATE_ISSUE_MUTATION, { ...params })
    const { issue, errors } = data.createIssue
    if (errors?.length || !issue) throw new Error(errors?.join(', ') || 'createIssue failed')
    return issue
  },

  async fetchAssignableUsers(boardId, repositoryFullName) {
    const data = await gql<{ items: AssignableUser[] }>(ASSIGNABLE_USERS_QUERY, { boardId, repositoryFullName })
    return data.items
  },

  async fetchLabels(boardId, repositoryFullName) {
    const data = await gql<{ items: GithubLabel[] }>(LABELS_QUERY, { boardId, repositoryFullName })
    return data.items
  },
}
