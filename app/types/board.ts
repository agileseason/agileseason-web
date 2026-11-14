// ---------- Типы ответа API (как приходит с бэкенда) ----------
export interface ApiLabel {
  name: string
  color: string // hex без '#'
}

export interface ApiUser {
  login: string
  url?: string
  avatarUrl?: string
}

export interface ApiPullRequest {
  id: number
  number: number
  isClosed: boolean
  isMerged: boolean
  url: string
  repositoryName: string
  assignees: ApiUser[]
}

export interface ApiIssue {
  id: number
  number: number
  title: string
  body: string
  labels: ApiLabel[]
  assignees: ApiUser[]
  color: string | null
  isBody: boolean
  isClosed: boolean
  isArchived: boolean
  totalSubtasks: number
  doneSubtasks: number
  position: number
  url: string
  repositoryName: string
  repositoryFullName: string
  createdAt: string
  createdAgo: string
  author: ApiUser
  columnId: number
  commentsCount: number
  ageDays: number
  pullRequests: ApiPullRequest[]
}

export interface ApiColumn {
  id: number
  name: string
  position: number
  isAutoAssign: boolean
  isAutoClose: boolean
  issues: ApiIssue[]
}

export interface ApiBoard {
  id: number
  name: string
  isOwner: boolean
  cacheKey: string
  columns: ApiColumn[]
  repositories: { id: number; name: string; fullName: string }[]
}

export interface BoardResponse {
  data: { board: ApiBoard }
}

// ---------- Типы для UI ----------
export const CARD_COLORS = [
  'blue',
  'azure',
  'indigo',
  'purple',
  'pink',
  'red',
  'orange',
  'yellow',
  'lime',
  'green',
  'teal',
  'cyan',
] as const

export type CardColor = (typeof CARD_COLORS)[number]

export interface CardLabel {
  name: string
  color: string // уже с '#'
  textColor: string
}

export interface CardAssignee {
  name: string
  src?: string
}

export interface CardPullRequest {
  id: number
  number: number
  url: string
  repositoryName: string
  state: 'open' | 'merged' | 'closed'
  assignees: CardAssignee[]
}

export interface Card {
  id: number
  number?: number
  repositoryName?: string
  repositoryFullName?: string // owner/name, нужен для запроса доступных исполнителей
  title: string
  description?: string
  color?: CardColor // заливка всей карточки (bg-COLOR-lt)
  labels: CardLabel[]
  assignees: CardAssignee[]
  comments: number
  subtasks?: { done: number; total: number }
  pullRequests: CardPullRequest[]
  url?: string
  createdAgo?: string
  isClosed: boolean
}

export interface Column {
  id: number
  title: string
  cards: Card[]
  collapsed?: boolean
  isAutoAssign?: boolean
  isAutoClose?: boolean
}
