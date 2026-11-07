import boardMock from '~/mocks/board.json'
import type { ApiBoard, BoardResponse } from '~/types/board'

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
