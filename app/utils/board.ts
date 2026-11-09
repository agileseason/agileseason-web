import { CARD_COLORS } from '~/types/board'
import type {
  ApiBoard,
  ApiIssue,
  ApiLabel,
  ApiUser,
  Card,
  CardAssignee,
  CardColor,
  CardLabel,
  Column,
} from '~/types/board'

// Typograf для неразрывных пробелов после союзов и предлогов
import Typograf from 'typograf'
const tp = new Typograf({ locale: ['ru', 'en-US'] });
tp.disableRule('*') // выключаем всё, кроме нужного: кавычки, тире и т.д. не трогаем
tp.enableRule('common/nbsp/afterShortWord')
tp.enableRule('ru/nbsp/*') // предлоги, союзы, частицы для русского

export const nbsp = (text: string) => tp.execute(text)
// ------------------------------------

// Бэкенд присылает произвольную строку, пропускаем только известные цвета
function pickColor(color: string | null): CardColor | undefined {
  return CARD_COLORS.find(c => c === color)
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

function mapUser(user: ApiUser): CardAssignee {
  return { name: user.login, src: user.avatarUrl }
}

export function mapIssue(issue: ApiIssue): Card {
  return {
    id: issue.id,
    number: issue.number,
    repositoryName: issue.repositoryName,
    title: issue.title,
    description: makeDescription(issue.body),
    color: pickColor(issue.color),
    labels: issue.labels.map(mapLabel),
    assignees: issue.assignees.map(mapUser),
    comments: issue.commentsCount,
    subtasks: issue.totalSubtasks > 0
      ? { done: issue.doneSubtasks, total: issue.totalSubtasks }
      : undefined,
    pullRequests: issue.pullRequests.map(pr => ({
      id: pr.id,
      number: pr.number,
      url: pr.url,
      repositoryName: pr.repositoryName,
      state: pr.isMerged ? 'merged' : pr.isClosed ? 'closed' : 'open',
      assignees: pr.assignees.map(mapUser),
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
