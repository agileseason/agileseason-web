import type {
  ApiBoard,
  ApiIssue,
  ApiLabel,
  Card,
  CardLabel,
  CardStatus,
  Column,
} from '~/types/board'

// Какой label даёт цветную полоску сверху (по приоритету)
const STATUS_BY_LABEL: [string, CardStatus][] = [
  ['bug', 'red'],
  ['question', 'orange'],
  ['design', 'purple'],
  ['enhancement', 'blue'],
  ['dependencies', 'yellow'],
]

function pickStatus(labels: ApiLabel[]): CardStatus | undefined {
  const names = new Set(labels.map(l => l.name))
  return STATUS_BY_LABEL.find(([name]) => names.has(name))?.[1]
}

// Контрастный цвет текста для бейджа
function textColorFor(hex: string): string {
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1f2937' : '#ffffff'
}

function mapLabel(label: ApiLabel): CardLabel {
  return { name: label.name, color: `#${label.color}`, textColor: textColorFor(label.color) }
}

// Из markdown-тела issue делаем короткое текстовое описание
function makeDescription(body: string, max = 140): string | undefined {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ') // блоки кода
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // картинки
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // ссылки -> текст
    .replace(/[#>*_`|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) return undefined
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}

export function mapIssue(issue: ApiIssue): Card {
  return {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    description: makeDescription(issue.body),
    status: pickStatus(issue.labels),
    labels: issue.labels.map(mapLabel),
    assignees: issue.assignees.map(a => ({ name: a.login, src: a.avatarUrl })),
    comments: issue.commentsCount,
    subtasks: issue.totalSubtasks > 0
      ? { done: issue.doneSubtasks, total: issue.totalSubtasks }
      : undefined,
    pullRequests: issue.pullRequests.map(pr => ({
      id: pr.id,
      number: pr.number,
      url: pr.url,
      state: pr.isMerged ? 'merged' : pr.isClosed ? 'closed' : 'open',
    })),
    url: issue.url,
    createdAgo: issue.createdAgo,
    isClosed: issue.isClosed,
  }
}

export function mapBoard(board: ApiBoard): Column[] {
  return [...board.columns]
    .sort((a, b) => a.position - b.position)
    .map(col => ({
      id: col.id,
      title: col.name,
      isAutoAssign: col.isAutoAssign,
      isAutoClose: col.isAutoClose,
      collapsed: false,
      cards: [...col.issues]
        .sort((a, b) => a.position - b.position)
        .map(mapIssue),
    }))
}
