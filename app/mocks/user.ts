// app/mocks/user.ts
import type { ApiCurrentUser } from '~/types/board'

// Время активности считаем от «сейчас», чтобы в mock были и свежие, и давние доски
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()
const HOUR = 60

const BL = { login: 'blackchestnut', avatarUrl: 'https://avatars.githubusercontent.com/u/2400100?v=4' }

// Ответ запроса user { ... } (data.user). Числа и колонки взяты из реального API.
export const MOCK_CURRENT_USER: ApiCurrentUser = {
  id: 1,
  username: 'blackchestnut',
  avatarUrl: 'https://avatars.githubusercontent.com/u/2400100?v=4',
  boards: [
    {
      id: 1,
      name: 'Agile Season',
      isOwner: true,
      users: [BL],
      repositories: [
        { name: 'agileseason', fullName: 'agileseason/agileseason' },
        { name: 'agileseason-api', fullName: 'blackchestnut/agileseason-api' },
      ],
      columns: [
        { id: 1, name: 'Backlog', position: 0, issuesCount: 9 },
        { id: 26, name: 'Todo Beta', position: 1, issuesCount: 7 },
        { id: 2, name: 'In Progress', position: 2, issuesCount: 1 },
        { id: 3, name: 'Testing', position: 3, issuesCount: 3 },
        { id: 4, name: 'Done', position: 4, issuesCount: 91 },
      ],
      stats: { openIssuesCount: 17, myOpenIssuesCount: 3, closedIssuesLastWeekCount: 0, lastActivityAt: '2025-03-30T18:03:35Z' },
    },
    {
      id: 3,
      name: 'Kladovkin',
      isOwner: true,
      users: [
        { login: 'morr', avatarUrl: 'https://avatars.githubusercontent.com/u/134610?v=4' },
        { login: 'hbda', avatarUrl: 'https://avatars.githubusercontent.com/u/7142331?v=4' },
        BL,
      ],
      repositories: [
        { name: 'minisklad', fullName: 'blackchestnut/minisklad' },
        { name: 'minisklad-app', fullName: 'blackchestnut/minisklad-app' },
      ],
      columns: [
        { id: 9, name: 'Входящие', position: 0, issuesCount: 118 },
        { id: 15, name: 'Важное несрочное', position: 2, issuesCount: 42 },
        { id: 17, name: 'Первая очередь', position: 3, issuesCount: 25 },
        { id: 18, name: 'В работе', position: 4, issuesCount: 12 },
        { id: 19, name: 'Ревью и тестирование', position: 5, issuesCount: 31 },
        { id: 20, name: 'Демо', position: 6, issuesCount: 4 },
        { id: 21, name: 'Готово', position: 7, issuesCount: 6018 },
      ],
      stats: { openIssuesCount: 153, myOpenIssuesCount: 51, closedIssuesLastWeekCount: 10, lastActivityAt: ago(35) },
    },
    {
      id: 2,
      name: 'myBudget',
      isOwner: true,
      users: [
        { login: 'mybudget', avatarUrl: 'https://avatars.githubusercontent.com/u/10397463?v=4' },
        BL,
      ],
      repositories: [
        { name: 'mybudget', fullName: 'mybudget-ws/mybudget' },
      ],
      columns: [
        { id: 13, name: 'Stocks Todo', position: 0, issuesCount: 9 },
        { id: 14, name: 'Todo', position: 1, issuesCount: 18 },
        { id: 6, name: 'In Progress', position: 2, issuesCount: 1 },
        { id: 42, name: 'Release Notes', position: 3, issuesCount: 5 },
        { id: 8, name: 'Done', position: 4, issuesCount: 207 },
      ],
      stats: { openIssuesCount: 26, myOpenIssuesCount: 1, closedIssuesLastWeekCount: 0, lastActivityAt: '2025-02-23T20:29:36Z' },
    },
    {
      id: 42,
      name: 'myBudget III',
      isOwner: true,
      users: [
        BL,
        { login: 'toucan-v8', avatarUrl: 'https://avatars.githubusercontent.com/u/67754856?v=4' },
      ],
      repositories: [
        { name: 'mybudget3', fullName: 'mybudget-ws/mybudget3' },
      ],
      columns: [
        { id: 200, name: 'Backlog', position: 0, issuesCount: 1 },
        { id: 204, name: 'Todo', position: 1, issuesCount: 0 },
        { id: 201, name: 'In Progress', position: 2, issuesCount: 5 },
        { id: 202, name: 'Testing', position: 3, issuesCount: 5 },
        { id: 203, name: 'Done', position: 4, issuesCount: 154 },
      ],
      stats: { openIssuesCount: 10, myOpenIssuesCount: 2, closedIssuesLastWeekCount: 0, lastActivityAt: ago(2 * HOUR) },
    },
    {
      id: 6,
      name: 'Tartaria',
      isOwner: true,
      users: [BL],
      repositories: [
        { name: 'tartaria', fullName: 'tartaria-one/tartaria' },
      ],
      columns: [
        { id: 37, name: 'Backlog', position: 1, issuesCount: 1 },
        { id: 38, name: 'In Progress', position: 2, issuesCount: 0 },
        { id: 39, name: 'Testing', position: 3, issuesCount: 0 },
        { id: 40, name: 'Done', position: 4, issuesCount: 1 },
      ],
      stats: { openIssuesCount: 1, myOpenIssuesCount: 0, closedIssuesLastWeekCount: 0, lastActivityAt: '2022-09-15T14:54:55Z' },
    },
  ],
  properties: { isMonoMarkdownFont: true },
}
