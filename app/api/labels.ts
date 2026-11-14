export interface GithubLabel {
  name: string
  color: string // hex без '#'
  description: string
}

// Запрос, который уходит на бэкенд (githubLabels)
export const LABELS_QUERY = `
  query($boardId:Int!, $repositoryFullName:String!) {
    items:githubLabels(boardId: $boardId, repositoryFullName: $repositoryFullName) {
      name
      color
      description
    }
  }
`

// Пока mock. Ответ реального запроса: { data: { items: GithubLabel[] } }
const MOCK_LABELS: GithubLabel[] = [
  { name: 'bug', color: 'b60205', description: 'Something isn\'t working' },
  { name: 'duplicate', color: 'cfd3d7', description: 'This issue or pull request already exists' },
  { name: 'enhancement', color: '29b6f6', description: 'New feature or request' },
  { name: 'invalid', color: 'e4e669', description: 'This doesn\'t seem right' },
  { name: 'question', color: 'd876e3', description: 'Further information is requested' },
  { name: 'wontfix', color: 'ffffff', description: 'This will not be worked on' },
  { name: 'dependencies', color: '92b8e5', description: 'Pull requests that update a dependency file' },
  { name: 'javascript', color: '168700', description: 'Pull requests that update javascript code' },
  { name: 'design', color: '9575CE', description: '' },
  { name: 'block', color: '757575', description: '' },
  { name: 'front-end', color: '0ec93c', description: '' },
  { name: 'back-end', color: '304ffe', description: '' },
]

export async function fetchLabels(
  boardId: number,
  repositoryFullName: string,
): Promise<GithubLabel[]> {
  // TODO: заменить на реальный запрос:
  //   variables: { boardId, repositoryFullName }, результат — data.items
  void boardId
  void repositoryFullName
  await new Promise(resolve => setTimeout(resolve, 300)) // имитация сети
  return MOCK_LABELS
}
