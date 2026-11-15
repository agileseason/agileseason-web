import type { AssignableUser, GithubLabel } from '~/api/types'

export const MOCK_USERS: AssignableUser[] = [
  {
    login: 'blackchestnut',
    avatarUrl: 'https://avatars.githubusercontent.com/u/2400100?u=b07d417cb29b681dc2db4fb0e0a3ff2d165ceae7&v=4',
  },
  {
    login: 'toucan-v8',
    avatarUrl: 'https://avatars.githubusercontent.com/u/67754856?v=4',
  },
]

export const MOCK_LABELS: GithubLabel[] = [
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
