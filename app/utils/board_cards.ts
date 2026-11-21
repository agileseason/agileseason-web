// app/utils/boardCard.ts
import type { ApiBoardColumnSummary, ApiUserBoard } from '~/types/board'
import { daysSince } from '~/utils/time_ago'

const STALE_DAYS = 14 // после скольки дней без активности помечаем доску
const MAX_LEGEND = 3 // сколько колонок подписываем под полоской
const MAX_REPOS = 2 // сколько репозиториев показываем чипами

export interface BoardCardSegment extends ApiBoardColumnSummary {
  opacity: number // чем правее колонка, тем насыщеннее цвет
}

// Всё, что нужно карточке доски в списке
export function buildBoardCard(board: ApiUserBoard) {
  // Последняя колонка по позиции — «Готово». В ней на порядки больше задач (6018 против 118),
  // поэтому в полоску она не входит: полоска показывает только открытую работу.
  const open = [...board.columns]
    .sort((a, b) => a.position - b.position)
    .slice(0, -1)

  const lastIndex = Math.max(open.length - 1, 1)
  const segments: BoardCardSegment[] = open
    .map((column, index) => ({ ...column, opacity: 0.35 + 0.65 * (index / lastIndex) }))
    .filter(segment => segment.issuesCount > 0)
  const total = segments.reduce((sum, segment) => sum + segment.issuesCount, 0)

  // подписываем самые большие колонки, но показываем их в порядке позиций
  const legend = [...segments]
    .sort((a, b) => b.issuesCount - a.issuesCount)
    .slice(0, MAX_LEGEND)
    .sort((a, b) => a.position - b.position)

  const { lastActivityAt } = board.stats
  return {
    board,
    segments,
    total,
    legend,
    hiddenColumnsCount: segments.length - legend.length,
    repositories: board.repositories.slice(0, MAX_REPOS),
    hiddenRepositoriesCount: Math.max(board.repositories.length - MAX_REPOS, 0),
    isStale: !lastActivityAt || daysSince(lastActivityAt) >= STALE_DAYS,
  }
}
