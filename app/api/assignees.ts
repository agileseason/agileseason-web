export interface AssignableUser {
  login: string
  avatarUrl: string
}

// Запрос, который уходит на бэкенд (githubAssignableUsers)
export const ASSIGNABLE_USERS_QUERY = `
  query($boardId:Int!, $repositoryFullName:String!) {
    items:githubAssignableUsers(boardId: $boardId, repositoryFullName: $repositoryFullName) {
      login
      avatarUrl
    }
  }
`

// Пока mock. Ответ реального запроса: { data: { items: AssignableUser[] } }
const MOCK_USERS: AssignableUser[] = [
  {
    login: 'blackchestnut',
    avatarUrl: 'https://avatars.githubusercontent.com/u/2400100?u=b07d417cb29b681dc2db4fb0e0a3ff2d165ceae7&v=4',
  },
  {
    login: 'toucan-v8',
    avatarUrl: 'https://avatars.githubusercontent.com/u/67754856?v=4',
  },
]

export async function fetchAssignableUsers(
  boardId: number,
  repositoryFullName: string,
): Promise<AssignableUser[]> {
  // TODO: заменить на реальный запрос:
  //   variables: { boardId, repositoryFullName }, результат — data.items
  void boardId
  void repositoryFullName
  await new Promise(resolve => setTimeout(resolve, 300)) // имитация сети
  return MOCK_USERS
}
