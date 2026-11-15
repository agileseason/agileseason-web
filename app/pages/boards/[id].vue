<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { SortableEvent } from 'vue-draggable-plus'
import {
  IconPlus,
  IconMessage,
  IconActivity,
  IconAlignLeft,
  IconCircleCheck,
  IconGitPullRequest,
  IconGitMerge,
  IconGitPullRequestClosed,
  IconX,
  IconChevronsLeft,
  IconChevronsRight,
  IconRefresh,
  IconLayoutKanban,
  IconTable,
  IconChevronDown,
  IconChevronRight,
  IconPencil,
} from '@tabler/icons-vue'
import { fetchBoard, moveIssue, createIssue, updateIssue } from '~/api/board'
import type { UpdateIssueParams } from '~/api/board'
import { fetchAssignableUsers } from '~/api/assignees'
import type { AssignableUser } from '~/api/assignees'
import { fetchLabels } from '~/api/labels'
import type { GithubLabel } from '~/api/labels'
import { mapBoard, mapIssue, makeDescription } from '~/utils/board'
import { CARD_COLORS } from '~/types/board'
import type { Card, CardColor, CardLabel, Column } from '~/types/board'

// ---------- маршрут ----------
// /boards/:id — доска, /boards/:id/issues/:issueId — доска с открытой задачей.
// Оба URL обслуживает один и тот же компонент (alias), а key зависит только от доски,
// поэтому при открытии/закрытии задачи страница не перемонтируется и доска не перезагружается.
definePageMeta({
  alias: ['/boards/:id()/issues/:issueId()'],
  key: route => `board-${route.params.id}`,
  scrollToTop: false, // не прыгать вверх при открытии/закрытии задачи
  validate: route =>
    /^\d+$/.test(String(route.params.id))
    && (route.params.issueId === undefined || /^\d+$/.test(String(route.params.issueId))),
})

const route = useRoute()
const router = useRouter()

const boardId = Number(route.params.id)
const boardPath = `/boards/${boardId}`

// ---------- загрузка данных ----------
const boardName = ref('Задачи')
const columns = ref<Column[]>([])
const isLoading = ref(true)
const loadError = ref('')
const repositories = ref<{ id: number, name: string, fullName: string }[]>([])
const isBoardReady = ref(false) // доска загружена хотя бы раз
const notice = ref('')

async function load() {
  isLoading.value = true
  loadError.value = ''
  try {
    const board = await fetchBoard(boardId)
    boardName.value = board.name
    columns.value = mapBoard(board)
    repositories.value = board.repositories ?? []
    isBoardReady.value = true
    syncModalWithRoute() // если открыли ссылку на задачу — показываем её
  } catch (e) {
    console.error(e)
    loadError.value = 'Не удалось загрузить доску'
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// ---------- вид: доска / таблица ----------
type ViewMode = 'board' | 'table'
const VIEW_KEY = 'board-view-mode'
const view = ref<ViewMode>('board')

onMounted(() => {
  try {
    const saved = localStorage.getItem(VIEW_KEY)
    if (saved === 'board' || saved === 'table') view.value = saved
  } catch { /* localStorage недоступен */ }
})

watch(view, (value) => {
  // при смене вида закрываем открытые формы, чтобы они не «зависли» скрытыми
  if (issueModal.value) closeIssueModal()
  cancelAddColumn()
  editingColumnId.value = null
  try {
    localStorage.setItem(VIEW_KEY, value)
  } catch { /* ignore */ }
})

// ---------- helpers ----------
function initials(name: string) {
  return name
    .split(/[\s\-_]+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function subtasksPercent(card: Card) {
  if (!card.subtasks?.total) return 0
  return Math.round((card.subtasks.done / card.subtasks.total) * 100)
}

const PR_COLOR: Record<string, string> = {
  open: 'text-green',
  merged: 'text-purple',
  closed: 'text-red',
}

const PR_ICON = {
  open: IconGitPullRequest,
  merged: IconGitMerge,
  closed: IconGitPullRequestClosed,
}

// ---------- создание и редактирование задачи (модальное окно) ----------
type IssueModal =
  | { mode: 'create', columnId: number }
  | { mode: 'edit', card: Card }

let nextId = -1 // локальные (ещё не сохранённые) карточки имеют отрицательные id
const issueModal = ref<IssueModal | null>(null) // null — окно закрыто
const formTitle = ref('')
const formDescription = ref('')
const titleInputEl = ref<HTMLInputElement | null>(null)
const formAssignees = ref<string[]>([]) // логины выбранных исполнителей
const formLabels = ref<string[]>([]) // названия выбранных меток
const formRepository = ref<string | null>(null) // fullName выбранного репозитория (только при создании)
const formColor = ref<CardColor | null>(null) // цвет заливки карточки, null — без цвета
const isSubmitting = ref(false)
const submitError = ref('')

// ---- справочники репозитория (исполнители, метки) ----
// Загружает список для репозитория, кэширует по repositoryFullName и игнорирует устаревшие ответы
function useRepositoryList<T>(
  fetcher: (boardId: number, repositoryFullName: string) => Promise<T[]>,
  errorMessage: string,
) {
  const items = shallowRef<T[]>([])
  const isLoading = ref(false)
  const error = ref('')
  const cache = new Map<string, T[]>()
  let requestId = 0

  async function load(repository: string | null) {
    const id = ++requestId
    error.value = ''
    items.value = []
    isLoading.value = false
    if (!repository) return

    const cached = cache.get(repository)
    if (cached) {
      items.value = cached
      return
    }

    isLoading.value = true
    try {
      const result = await fetcher(boardId, repository)
      cache.set(repository, result)
      if (id === requestId) items.value = result
    } catch (e) {
      console.error(e)
      if (id === requestId) error.value = errorMessage
    } finally {
      if (id === requestId) isLoading.value = false
    }
  }

  // игнорируем ответ запроса, если окно уже закрыто
  function cancel() {
    requestId++
    isLoading.value = false
  }

  return { items, isLoading, error, load, cancel }
}

// репозиторий, для которого запрашиваем справочники
const modalRepository = computed(() => {
  const modal = issueModal.value
  if (!modal) return null
  if (modal.mode === 'edit') {
    // репозиторий существующей задачи не меняется;
    // запасной вариант — если на доске всего один репозиторий
    return modal.card.repositoryFullName
      ?? (repositories.value.length === 1 ? repositories.value[0].fullName : null)
  }
  return formRepository.value // при создании — выбор пользователя
})

const {
  items: assignableUsers,
  isLoading: isAssigneesLoading,
  error: assigneesError,
  load: loadAssigneesFor,
  cancel: cancelAssignees,
} = useRepositoryList<AssignableUser>(fetchAssignableUsers, 'Не удалось загрузить пользователей')

const {
  items: githubLabels,
  isLoading: isLabelsLoading,
  error: labelsError,
  load: loadLabelsFor,
  cancel: cancelLabels,
} = useRepositoryList<GithubLabel>(fetchLabels, 'Не удалось загрузить метки')

const loadAssignableUsers = () => loadAssigneesFor(modalRepository.value)
const loadLabels = () => loadLabelsFor(modalRepository.value)

// исполнители и метки специфичны для репозитория: при смене выбора (создание) сбрасываем их
watch(formRepository, () => {
  if (issueModal.value?.mode === 'edit') return // у существующей задачи списки не сбрасываем
  formAssignees.value = []
  formLabels.value = []
})

// справочники грузим при каждой смене репозитория в окне
watch(modalRepository, () => {
  loadAssignableUsers()
  loadLabels()
})

// варианты для выбора: доступные пользователи + текущие исполнители, которых нет в списке
const assigneeOptions = computed(() => {
  const options = assignableUsers.value.map(u => ({ login: u.login, src: u.avatarUrl }))
  const modal = issueModal.value
  if (modal?.mode === 'edit') {
    for (const a of modal.card.assignees) {
      if (!options.some(o => o.login === a.name)) options.push({ login: a.name, src: a.src ?? '' })
    }
  }
  return options
})

function selectedAssignees() {
  return formAssignees.value.map((login) => {
    const option = assigneeOptions.value.find(o => o.login === login)
    return { name: login, src: option?.src || undefined }
  })
}

// цвет текста на заливке метки: тёмный или светлый в зависимости от яркости фона
function labelTextColor(hex: string) {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#000000' : '#ffffff'
}

// варианты меток: доступные в репозитории + текущие метки карточки, которых нет в списке
const labelOptions = computed(() => {
  const result: (CardLabel & { description: string })[] = []
  for (const l of githubLabels.value) {
    const color = `#${l.color.replace('#', '')}`
    result.push({ name: l.name, color, textColor: labelTextColor(color), description: l.description })
  }
  const modal = issueModal.value
  if (modal?.mode === 'edit') {
    for (const l of modal.card.labels) {
      if (!result.some(o => o.name === l.name)) result.push({ ...l, description: '' })
    }
  }
  return result
})

function selectedLabels(): CardLabel[] {
  return formLabels.value.flatMap((name) => {
    const option = labelOptions.value.find(o => o.name === name)
    return option ? [{ name: option.name, color: option.color, textColor: option.textColor }] : []
  })
}

// колонка, в которую создаём задачу (только в режиме создания)
const modalColumn = computed(() => {
  const modal = issueModal.value
  if (modal?.mode !== 'create') return null
  return columns.value.find(c => c.id === modal.columnId) ?? null
})

// при создании репозиторий обязателен
const isRepositoryMissing = computed(() => issueModal.value?.mode === 'create' && !formRepository.value)
const canSubmit = computed(() => !!formTitle.value.trim() && !isRepositoryMissing.value && !isSubmitting.value)

// окно открыто, только если есть валидная цель (колонка существует)
const isIssueModalOpen = computed(() => {
  const modal = issueModal.value
  if (!modal) return false
  return modal.mode === 'edit' || !!modalColumn.value
})

async function focusTitle(select = false) {
  await nextTick()
  titleInputEl.value?.focus()
  if (select) titleInputEl.value?.select()
}

function startAdd(columnId: number) {
  issueModal.value = { mode: 'create', columnId }
  formTitle.value = ''
  formDescription.value = ''
  formAssignees.value = []
  formLabels.value = []
  submitError.value = ''
  formColor.value = null
  // единственный репозиторий выбираем сразу, при нескольких пользователь выбирает сам
  formRepository.value = repositories.value.length === 1 ? repositories.value[0].fullName : null
  focusTitle()
}

// Открытие задачи: меняем URL, а само окно открывает syncModalWithRoute (см. ниже)
function openEdit(card: Card) {
  if (card.id < 0) { // локальная карточка, на сервере её ещё нет — URL не нужен
    showEditModal(card)
    return
  }
  router.push({ path: `${boardPath}/issues/${card.id}`, query: route.query })
}

function showEditModal(card: Card) {
  notice.value = ''
  stopEditing()
  issueModal.value = { mode: 'edit', card }
  formRepository.value = null
  submitError.value = ''
  formColor.value = card.color ?? null
  formAssignees.value = card.assignees.map(a => a.name)
  formLabels.value = card.labels.map(l => l.name)
}

// ---- синхронизация модального окна с URL ----
// card.id — внутренний id задачи (тот же, что уходит в moveIssue)
const routeIssueId = computed(() => {
  const raw = route.params.issueId
  return raw === undefined ? null : Number(raw)
})

function findCard(id: number): Card | null {
  for (const column of columns.value) {
    const card = column.cards.find(c => c.id === id)
    if (card) return card
  }
  return null
}

function syncModalWithRoute() {
  // страницу уже покидаем или доска ещё не загружена
  if (!isBoardReady.value || String(route.params.id) !== String(boardId)) return

  const id = routeIssueId.value
  const modal = issueModal.value

  if (id === null) {
    // «Назад» в браузере: закрываем окно редактирования (форму создания не трогаем)
    if (modal?.mode === 'edit') resetIssueModal()
    return
  }
  if (modal?.mode === 'edit' && modal.card.id === id) return

  const card = findCard(id)
  if (card) {
    showEditModal(card)
  } else {
    resetIssueModal()
    notice.value = `Задача ${id} не найдена на этой доске`
    router.replace({ path: boardPath, query: route.query })
  }
}

watch(routeIssueId, syncModalWithRoute)

// Убираем /issues/:id из URL. Если пришли с доски кликом — просто «назад»,
// чтобы не копить лишние записи в истории; если открыли ссылку напрямую — replace.
function leaveIssueRoute() {
  const back = (window.history.state as { back?: string | null } | null)?.back
  if (typeof back === 'string' && back.split('?')[0] === boardPath) {
    router.back()
  } else {
    router.replace({ path: boardPath, query: route.query })
  }
}

function closeIssueModal() {
  resetIssueModal()
  if (routeIssueId.value !== null) leaveIssueRoute()
}

function resetIssueModal() {
  stopEditing()
  issueModal.value = null
  formRepository.value = null
  formColor.value = null
  submitError.value = ''
  formTitle.value = ''
  formDescription.value = ''
  formAssignees.value = []
  formLabels.value = []
  cancelAssignees()
  cancelLabels()
}

// Создание задачи. Существующие задачи сохраняются сразу при каждом изменении (см. persistCard)
async function submitIssue() {
  const modal = issueModal.value
  const title = formTitle.value.trim()
  if (modal?.mode !== 'create' || !title || !canSubmit.value) return
  const description = formDescription.value.trim()

  const column = modalColumn.value
  const repositoryFullName = formRepository.value
  if (!column || !repositoryFullName) return
  const repository = repositories.value.find(r => r.fullName === repositoryFullName)
  if (!repository) return

  isSubmitting.value = true
  submitError.value = ''
  try {
    const issue = await createIssue({
      boardId,
      columnId: column.id,
      repositoryId: repository.id, // выбранный репозиторий
      title,
      body: description,
      position: 'top',
      assignees: formAssignees.value,
      labels: formLabels.value,
      color: formColor.value ?? undefined,
    })
    column.cards.unshift(mapIssue(issue))
    column.collapsed = false // чтобы новая задача сразу была видна
  } catch (e) {
    console.error(e)
    submitError.value = 'Не удалось создать задачу'
    return
  } finally {
    isSubmitting.value = false
  }
  closeIssueModal()
}

// ---------- редактирование существующей задачи (как в Trello) ----------
// Каждое изменение применяется к карточке сразу и отправляется на сервер;
// при ошибке карточка откатывается к предыдущему значению.
const isEditingIssueTitle = ref(false)
const issueTitleDraft = ref('')
const issueTitleInputEl = ref<HTMLInputElement | null>(null)

const isEditingBody = ref(false)
const bodyDraft = ref('')
const bodyInputEl = ref<HTMLTextAreaElement | null>(null)

// описание в виде HTML (markdown-it без сырого HTML, ссылки безопасны)
const renderedBody = computed(() => {
  const modal = issueModal.value
  return modal?.mode === 'edit' ? renderMarkdown(modal.card.body ?? '') : ''
})

function stopEditing() {
  isEditingIssueTitle.value = false
  isEditingBody.value = false
}

// запросы выполняются по очереди, чтобы быстрые изменения не обгоняли друг друга
let saveChain: Promise<void> = Promise.resolve()

function persistCard(card: Card, patch: Omit<UpdateIssueParams, 'issueId'>, revert: () => void) {
  if (card.id < 0) return // локальная карточка: на сервере её нет
  saveChain = saveChain.then(async () => {
    try {
      submitError.value = ''
      await updateIssue({ issueId: card.id, ...patch })
    } catch (e) {
      console.error(e)
      revert()
      submitError.value = 'Не удалось сохранить изменения'
    }
  })
}

const isCurrentCard = (card: Card) => issueModal.value?.mode === 'edit' && issueModal.value.card === card

// ---- заголовок ----
async function startEditIssueTitle() {
  const modal = issueModal.value
  if (modal?.mode !== 'edit') return
  issueTitleDraft.value = modal.card.title
  isEditingIssueTitle.value = true
  await nextTick()
  issueTitleInputEl.value?.focus()
  issueTitleInputEl.value?.select()
}

function saveIssueTitle() {
  // защита от повторного вызова (Enter + blur)
  const modal = issueModal.value
  if (modal?.mode !== 'edit' || !isEditingIssueTitle.value) return
  const card = modal.card
  const title = issueTitleDraft.value.trim()
  isEditingIssueTitle.value = false
  if (!title || title === card.title) return // пустое название не сохраняем

  const prev = card.title
  card.title = title
  persistCard(card, { title }, () => { card.title = prev })
}

function cancelEditIssueTitle() {
  isEditingIssueTitle.value = false
}

// ---- описание ----
function autoGrow() {
  const el = bodyInputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px` // + рамки
}

async function startEditBody() {
  const modal = issueModal.value
  if (modal?.mode !== 'edit') return
  bodyDraft.value = modal.card.body ?? ''
  isEditingBody.value = true
  await nextTick()
  const el = bodyInputEl.value
  if (!el) return
  autoGrow()
  el.focus()
  el.setSelectionRange(el.value.length, el.value.length)
}

function saveBody() {
  const modal = issueModal.value
  if (modal?.mode !== 'edit' || !isEditingBody.value) return
  const card = modal.card
  const body = bodyDraft.value.trim()
  isEditingBody.value = false
  if (body === (card.body ?? '').trim()) return

  updateBody(card, body)
}

// Применяет новое описание к карточке и отправляет на сервер (откат при ошибке)
function updateBody(card: Card, body: string) {
  const prev = { body: card.body, description: card.description, subtasks: card.subtasks }
  card.body = body
  card.description = makeDescription(body)
  // прогресс подзадач на карточке (totalSubtasks / doneSubtasks) зависит от чекбоксов в тексте
  const tasks = countTasks(body)
  card.subtasks = tasks.total > 0 ? tasks : undefined
  persistCard(card, { body }, () => {
    card.body = prev.body
    card.description = prev.description
    card.subtasks = prev.subtasks
  })
}

// Клик по чекбоксу «- [ ]» в отрендеренном описании: меняем строку в markdown и сохраняем
function onBodyClick(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof HTMLInputElement) || !target.classList.contains('task-checkbox')) return

  const modal = issueModal.value
  const body = modal?.mode === 'edit'
    ? setTaskChecked(modal.card.body ?? '', Number(target.dataset.line), target.checked)
    : null
  if (modal?.mode !== 'edit' || body === null) {
    event.preventDefault() // не удалось найти пункт в тексте — оставляем чекбокс как был
    return
  }
  updateBody(modal.card, body)
}

function cancelEditBody() {
  isEditingBody.value = false
}

// ---- исполнители, метки, цвет: применяются сразу при выборе ----
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x))

watch(formAssignees, (logins) => {
  const modal = issueModal.value
  if (modal?.mode !== 'edit') return
  const card = modal.card
  const prev = card.assignees
  if (sameSet(logins, prev.map(a => a.name))) return // форму только что заполнили из карточки

  card.assignees = selectedAssignees()
  persistCard(card, { assignees: [...logins] }, () => {
    card.assignees = prev
    if (isCurrentCard(card)) formAssignees.value = prev.map(a => a.name)
  })
})

watch(formLabels, (names) => {
  const modal = issueModal.value
  if (modal?.mode !== 'edit') return
  const card = modal.card
  const prev = card.labels
  if (sameSet(names, prev.map(l => l.name))) return

  card.labels = selectedLabels()
  persistCard(card, { labels: [...names] }, () => {
    card.labels = prev
    if (isCurrentCard(card)) formLabels.value = prev.map(l => l.name)
  })
})

watch(formColor, (color) => {
  const modal = issueModal.value
  if (modal?.mode !== 'edit') return
  const card = modal.card
  const prev = card.color
  if ((color ?? undefined) === prev) return

  card.color = color ?? undefined
  persistCard(card, { color }, () => {
    card.color = prev
    if (isCurrentCard(card)) formColor.value = prev ?? null
  })
})

// блокируем прокрутку страницы под открытым модальным окном
// Esc: сначала отменяет редактирование заголовка/описания, следующий Esc закрывает окно.
// Слушаем document, а не само окно: после отмены поле ввода исчезает, фокус уходит на body,
// и события клавиатуры до окна уже не доходят.
function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.isComposing || event.defaultPrevented) return
  if (isEditingIssueTitle.value) cancelEditIssueTitle()
  else if (isEditingBody.value) cancelEditBody()
  else closeIssueModal()
}

watch(isIssueModalOpen, (open) => {
  document.body.classList.toggle('modal-open', open)
  if (open) document.addEventListener('keydown', onDocumentKeydown)
  else document.removeEventListener('keydown', onDocumentKeydown)
})
onBeforeUnmount(() => {
  document.body.classList.remove('modal-open')
  document.removeEventListener('keydown', onDocumentKeydown)
})

// ---------- добавление колонки ----------
const isAddingColumn = ref(false)
const newColumnTitle = ref('')
const newColumnInput = ref<HTMLInputElement | null>(null)

async function startAddColumn() {
  isAddingColumn.value = true
  newColumnTitle.value = ''
  await nextTick()
  newColumnInput.value?.focus()
}

function cancelAddColumn() {
  isAddingColumn.value = false
  newColumnTitle.value = ''
}

function addColumn() {
  const title = newColumnTitle.value.trim()
  if (!title) return

  // TODO: заменить на мутацию создания колонки
  columns.value.push({ id: nextId--, title, cards: [] })
  cancelAddColumn()
}

// ---------- сворачивание колонки ----------
function toggleCollapse(column: Column) {
  if (!column.collapsed) {
    if (editingColumnId.value === column.id) editingColumnId.value = null
  }
  column.collapsed = !column.collapsed
}

// ---------- редактирование заголовка колонки ----------
const editingColumnId = ref<number | null>(null)
const editingTitle = ref('')
const titleInputs = new Map<number, HTMLInputElement>()

function setTitleInput(columnId: number, el: unknown) {
  if (el) titleInputs.set(columnId, el as HTMLInputElement)
  else titleInputs.delete(columnId)
}

async function startEditTitle(column: Column) {
  editingColumnId.value = column.id
  editingTitle.value = column.title
  await nextTick()
  const input = titleInputs.get(column.id)
  input?.focus()
  input?.select()
}

function saveTitle(column: Column) {
  // защита от повторного вызова (Enter + blur)
  if (editingColumnId.value !== column.id) return

  const title = editingTitle.value.trim()
  if (title && title !== column.title) {
    column.title = title
    // TODO: мутация updateColumnTitle(column.id, title)
  }
  editingColumnId.value = null
}

function cancelEditTitle() {
  editingColumnId.value = null
}

// ---------- перемещение карточек ----------
async function onCardsChange(column: Column, evt: SortableEvent) {
  await nextTick() // дожидаемся, пока v-model обновит column.cards
  const card = column.cards[evt.newIndex ?? -1]
  if (!card || card.id < 0) return // локальные карточки ещё не созданы на сервере

  try {
    await moveIssue({
      issueId: card.id,
      columnId: column.id,
      position: (evt.newIndex ?? 0) + 1,
    })
  } catch (e) {
    console.error(e)
    // TODO: откатить перемещение или перезагрузить доску
    await load()
  }
}
</script>

<template>
  <!-- BEGIN PAGE HEADER -->
  <div class='page-header d-print-none'>
    <div class='container-fluid'>
      <div class='row g-2 align-items-center'>
        <div class='col'>
          <h1 class='page-title'>{{ boardName }}</h1>
       </div>
        <div class='col-auto'>
          <div class='btn-group bg-fill-tertiary' role='group' aria-label='Вид'>
            <button
              type='button'
              class='btn btn-sm'
              :class='view === "board" ? "btn-outline-primary" : "btn-outline-secondary"'
              :aria-pressed='view === "board"'
              @click='view = "board"'
            >
              <IconLayoutKanban class='icon' />
              Доска
            </button>
            <button
              type='button'
              class='btn btn-sm'
              :class='view === "table" ? "btn-outline-primary" : "btn-outline-secondary"'
              :aria-pressed='view === "table"'
              @click='view = "table"'
            >
              <IconTable class='icon' />
              Таблица
            </button>
          </div>
        </div>
        <div class='col-auto'>
          <button
            type='button'
            class='btn btn-ghost-secondary btn-icon'
            aria-label='Обновить'
            title='Обновить'
            :disabled='isLoading'
            @click='load'
          >
            <IconRefresh class='icon' />
          </button>
        </div>
      </div>
    </div>
  </div>
  <!-- END PAGE HEADER -->

  <!-- BEGIN PAGE BODY -->
  <div class='page-body'>
    <div class='container-fluid'>
      <!-- Уведомление (например, задача по ссылке не найдена) -->
      <div v-if='notice' class='alert alert-warning alert-dismissible' role='alert'>
        {{ notice }}
        <button type='button' class='btn-close' aria-label='Закрыть' @click='notice = ""' />
      </div>

      <!-- Загрузка -->
      <div
        v-if='isLoading && !columns.length'
        class='d-flex justify-content-center align-items-center'
        style='min-height: 50vh'
      >
        <div class='spinner-border text-primary' role='status'>
          <span class='visually-hidden'>Загрузка…</span>
        </div>
      </div>

      <!-- Ошибка -->
      <div v-else-if='loadError' class='alert alert-danger' role='alert'>
        {{ loadError }}
        <button type='button' class='btn btn-sm btn-danger ms-3' @click='load'>Повторить</button>
      </div>

      <!-- Доска -->
      <div v-else-if='view === "board"' class='kanban-board d-flex align-items-start gap-3 pb-3'>
        <!-- Перетаскивание колонок (за заголовок) -->
        <VueDraggable
          v-model='columns'
          class='column d-flex align-items-start gap-3'
          handle='.column-header'
          :animation='200'
          chosen-class='kanban-chosen'
          ghost-class='kanban-ghost'
        >
          <div
            v-for='column in columns'
            :key='column.id'
            class='kanban-column'
            :class='{ &apos;is-collapsed&apos;: column.collapsed }'
          >
            <!-- Свёрнутая колонка -->
            <div v-if='column.collapsed' class='card card-sm'>
              <div
                class='card-body column-header d-flex flex-column align-items-center gap-2 px-0'
                title='Перетащить колонку'
              >
                <span class='badge bg-secondary-lt'>{{ column.cards.length }}</span>
                <h2 class='mb-0 column-title-vertical' title='Развернуть колонку' @click='toggleCollapse(column)'>
                  {{ column.title }}
                </h2>
                <button
                  type='button'
                  class='btn btn-ghost-secondary btn-icon btn-sm'
                  aria-label='Развернуть колонку'
                  title='Развернуть колонку'
                  @click='toggleCollapse(column)'
                >
                  <IconChevronsRight class='icon' />
                </button>
              </div>
            </div>

            <template v-else>
              <div class='column-header d-flex align-items-center mb-3' title='Перетащить колонку'>
                <span class='badge bg-secondary-lt me-2'>{{ column.cards.length }}</span>
                <input
                  v-if='editingColumnId === column.id'
                  :ref='(el) => setTitleInput(column.id, el)'
                  v-model='editingTitle'
                  type='text'
                  class='form-control form-control-sm column-title-input'
                  @keyup.enter='saveTitle(column)'
                  @keyup.esc='cancelEditTitle'
                  @blur='saveTitle(column)'
                >
                <h2
                  v-else
                  class='mb-0 column-title text-truncate'
                  title='Нажмите, чтобы переименовать'
                  @click='startEditTitle(column)'
                >
                  {{ column.title }}
                </h2>

                <IconCircleCheck
                  v-if='column.isAutoClose'
                  class='icon ms-2 text-green flex-shrink-0'
                  title='Задачи в этой колонке закрываются автоматически'
                />

                <div class='ms-auto d-flex flex-shrink-0'>
                  <button
                    type='button'
                    class='btn btn-ghost-secondary btn-icon btn-sm'
                    aria-label='Свернуть колонку'
                    title='Свернуть колонку'
                    @click='toggleCollapse(column)'
                  >
                    <IconChevronsLeft class='icon' />
                  </button>
                  <button
                    type='button'
                    class='btn btn-ghost-secondary btn-icon btn-sm'
                    aria-label='Добавить задачу'
                    title='Добавить задачу'
                    @click='startAdd(column.id)'
                  >
                    <IconPlus class='icon' />
                  </button>
                </div>
              </div>

              <div class='mb-4'>
                <!-- Список карточек с вертикальной прокруткой (в Done их много) -->
                <div class='kanban-scroll'>
                  <VueDraggable
                    v-model='column.cards'
                    class='row row-cards kanban-list'
                    group='cards'
                    :animation='150'
                    ghost-class='kanban-ghost'
                    chosen-class='kanban-chosen'
                    @add='onCardsChange(column, $event)'
                    @update='onCardsChange(column, $event)'
                  >
                    <div v-for='card in column.cards' :key='card.id' class='kanban-card-wrapper col-12'>
                      <div
                        class='card card-sm kanban-card'
                        :class='card.color && `bg-${card.color}-lt`'
                        @click='openEdit(card)'
                      >
                        <div class='card-body'>
                          <div class='d-flex align-items-start gap-2'>
                            <h2 class='card-title mb-0 flex-fill'>{{ nbsp(card.title) }}</h2>
                            <IconCircleCheck
                              v-if='card.isClosed'
                              class='icon icon-inline text-green flex-shrink-0'
                              title='Закрыта'
                            />
                          </div>

                          <!-- Описание пока скрыто
                          <div v-if="card.description" class="text-secondary mt-2 card-description">
                            {{ card.description }}
                          </div>
                          -->

                          <!-- Номер задачи, репозиторий и время создания -->
                          <div
                            v-if='card.number || card.createdAgo'
                            class='d-flex align-items-center justify-content-between gap-2 mt-2'
                          >
                            <div v-if='card.number' class='text-truncate'>
                              <a
                                v-if='card.url'
                                :href='card.url'
                                target='_blank'
                                rel='noopener'
                                class='text-decoration-none link-secondary'
                                @click.stop
                              >
                                <strong>#{{ card.number }}</strong>
                                <span v-if='card.repositoryName'>&nbsp;{{ card.repositoryName }}</span>
                              </a>
                              <strong v-else>#{{ card.number }}</strong>
                            </div>
                            <span v-if='card.createdAgo' class='text-secondary small ms-auto flex-shrink-0' title='Создана'>
                              {{ card.createdAgo }}
                            </span>
                          </div>

                          <!-- Метки -->
                          <div v-if='card.labels.length' class='d-flex flex-wrap gap-1 mt-2'>
                            <span
                              v-for='label in card.labels'
                              :key='label.name'
                              class='badge'
                              :style='{ backgroundColor: label.color, color: label.textColor }'
                            >
                              {{ label.name }}
                            </span>
                          </div>

                          <!-- Прогресс подзадач -->
                          <div v-if='card.subtasks' class='mt-2'>
                            <div class='progress'>
                              <div
                                class='progress-bar'
                                role='progressbar'
                                :style='{ width: `${subtasksPercent(card)}%` }'
                              />
                            </div>
                          </div>

                          <div class='mt-2'>
                            <div class='row align-items-center g-2'>
                              <!-- Есть описание -->
                              <div v-if='card.description' class='col-auto'>
                                <span class='text-secondary' title='Есть описание'>
                                  <IconAlignLeft class='icon icon-inline' />
                                </span>
                              </div>

                              <!-- Комментарии -->
                              <div v-if='card.comments' class='col-auto'>
                                <span class='text-secondary' title='Комментарии'>
                                  <IconMessage class='icon icon-inline' />
                                  {{ card.comments }}
                                </span>
                              </div>

                              <!-- Подзадачи -->
                              <div v-if='card.subtasks' class='col-auto'>
                                <span class='text-secondary' title='Подзадачи'>
                                  <IconActivity class='icon icon-inline' />
                                  {{ card.subtasks.done }}/{{ card.subtasks.total }}
                                </span>
                              </div>

                              <!-- Исполнители (всегда справа) -->
                              <div v-if='card.assignees.length' class='col-auto ms-auto'>
                                <div class='avatar-list avatar-list-stacked avatar-list-xs'>
                                  <span
                                    v-for='user in card.assignees'
                                    :key='user.name'
                                    class='avatar avatar-xs'
                                    :title='user.name'
                                    :style='user.src ? { backgroundImage: `url(${user.src})` } : undefined'
                                  >
                                    <template v-if='!user.src'>{{ initials(user.name) }}</template>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <!-- Pull request-ы -->
                          <ul v-if='card.pullRequests.length' class='list-unstyled mt-3 mb-0 pr-list'>
                            <li
                              v-for='pr in card.pullRequests'
                              :key='pr.id'
                              class='d-flex align-items-center justify-content-between pr-item'
                            >
															<div>
																<component
																	:is='PR_ICON[pr.state]'
																	class='icon icon-inline flex-shrink-0 me-1'
																	:class='PR_COLOR[pr.state]'
																/>
																<a
																	:href='pr.url'
																	target='_blank'
																	rel='noopener'
																	class='text-decoration-none text-truncate link-secondary'
																	@click.stop
																>
																	<strong>#{{ pr.number }}</strong>&nbsp;{{ pr.repositoryName }}
																</a>
															</div>
                              <div
                                v-if='pr.assignees?.length'
                                class='avatar-list avatar-list-stacked avatar-list-xs flex-shrink-0'
                              >
                                <span
                                  v-for='user in pr.assignees'
                                  :key='user.name'
                                  class='avatar avatar-xs'
                                  :title='user.name'
                                  :style='user.src ? { backgroundImage: `url(${user.src})` } : undefined'
                                >
                                  <template v-if='!user.src'>{{ initials(user.name) }}</template>
                                </span>
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </VueDraggable>
                </div>
              </div>
            </template>
          </div>
        </VueDraggable>

        <!-- Заглушка «новая колонка» -->
        <div class='kanban-column'>
          <div v-if='isAddingColumn' class='card card-sm'>
            <div class='card-body'>
              <input
                ref='newColumnInput'
                v-model='newColumnTitle'
                type='text'
                class='form-control mb-2'
                placeholder='Название колонки'
                @keyup.enter='addColumn'
                @keyup.esc='cancelAddColumn'
              >
              <div class='d-flex gap-2'>
                <button
                  type='button'
                  class='btn btn-primary btn-sm'
                  :disabled='!newColumnTitle.trim()'
                  @click='addColumn'
                >
                  Добавить колонку
                </button>
                <button
                  type='button'
                  class='btn btn-ghost-secondary btn-sm btn-icon'
                  aria-label='Отмена'
                  @click='cancelAddColumn'
                >
                  <IconX class='icon' />
                </button>
              </div>
            </div>
          </div>
          <button
            v-else
            type='button'
            class='btn btn-outline-secondary w-100 add-column-btn'
            @click='startAddColumn'
          >
            <IconPlus class='icon' />
            Добавить колонку
          </button>
        </div>
      </div>

      <!-- Таблица: задачи сгруппированы по колонкам -->
      <div v-else class='kanban-table pb-3'>
        <div class='table-scroll'>
          <div class='table-inner'>
            <!-- Заголовки столбцов -->
            <div class='table-row-grid table-head text-secondary small fw-bold text-uppercase px-3 pb-2'>
              <div>Задача</div>
              <div>Номер</div>
              <div>Детали</div>
              <div>Pull request-ы</div>
              <div>Исполнители</div>
              <div class='text-end'>Создана</div>
            </div>

            <!-- Перетаскивание групп-колонок (за заголовок группы) -->
            <VueDraggable
              v-model='columns'
              class='d-flex flex-column gap-3'
              handle='.group-header'
              :animation='200'
              ghost-class='kanban-ghost'
            >
              <div v-for='column in columns' :key='column.id' class='card card-sm table-group'>
                <div class='group-header d-flex align-items-center px-3 py-2' title='Перетащить колонку'>
                  <button
                    type='button'
                    class='btn btn-ghost-secondary btn-icon btn-sm me-2'
                    :aria-label='column.collapsed ? "Развернуть колонку" : "Свернуть колонку"'
                    :title='column.collapsed ? "Развернуть колонку" : "Свернуть колонку"'
                    @click='toggleCollapse(column)'
                  >
                    <IconChevronRight v-if='column.collapsed' class='icon' />
                    <IconChevronDown v-else class='icon' />
                  </button>

                  <input
                    v-if='editingColumnId === column.id'
                    :ref='(el) => setTitleInput(column.id, el)'
                    v-model='editingTitle'
                    type='text'
                    class='form-control form-control-sm column-title-input'
                    @keyup.enter='saveTitle(column)'
                    @keyup.esc='cancelEditTitle'
                    @blur='saveTitle(column)'
                  >
                  <h2
                    v-else
                    class='mb-0 column-title text-truncate'
                    title='Нажмите, чтобы переименовать'
                    @click='startEditTitle(column)'
                  >
                    {{ column.title }}
                  </h2>

                  <span class='badge bg-secondary-lt ms-2'>{{ column.cards.length }}</span>
                  <IconCircleCheck
                    v-if='column.isAutoClose'
                    class='icon ms-2 text-green flex-shrink-0'
                    title='Задачи в этой колонке закрываются автоматически'
                  />

                  <button
                    type='button'
                    class='btn btn-ghost-secondary btn-icon btn-sm ms-auto flex-shrink-0'
                    aria-label='Добавить задачу'
                    title='Добавить задачу'
                    @click='startAdd(column.id)'
                  >
                    <IconPlus class='icon' />
                  </button>
                </div>

                <template v-if='!column.collapsed'>
                  <!-- Строки-задачи; group='cards' позволяет переносить их между колонками -->
                  <VueDraggable
                    v-model='column.cards'
                    class='table-body'
                    group='cards'
                    :animation='150'
                    ghost-class='kanban-ghost'
                    chosen-class='kanban-chosen'
                    @add='onCardsChange(column, $event)'
                    @update='onCardsChange(column, $event)'
                  >
                    <div
                      v-for='card in column.cards'
                      :key='card.id'
                      class='table-row-grid table-row-item px-3 py-2'
                      :class='card.color && `bg-${card.color}-lt`'
                      @click='openEdit(card)'
                    >
                      <!-- Задача + метки -->
                      <div class='min-w-0'>
                        <div class='d-flex align-items-start gap-2'>
                          <span class='fw-medium'>{{ nbsp(card.title) }}</span>
                          <IconCircleCheck
                            v-if='card.isClosed'
                            class='icon icon-inline text-green flex-shrink-0'
                            title='Закрыта'
                          />
                        </div>
                        <div v-if='card.labels.length' class='d-flex flex-wrap gap-1 mt-1'>
                          <span
                            v-for='label in card.labels'
                            :key='label.name'
                            class='badge'
                            :style='{ backgroundColor: label.color, color: label.textColor }'
                          >
                            {{ label.name }}
                          </span>
                        </div>
                      </div>

                      <!-- Номер / репозиторий -->
                      <div class='text-truncate'>
                        <template v-if='card.number'>
                          <a
                            v-if='card.url'
                            :href='card.url'
                            target='_blank'
                            rel='noopener'
                            class='text-decoration-none link-secondary'
                            @click.stop
                          >
                            <strong>#{{ card.number }}</strong>
                            <span v-if='card.repositoryName'>&nbsp;{{ card.repositoryName }}</span>
                          </a>
                          <strong v-else>#{{ card.number }}</strong>
                        </template>
                      </div>

                      <!-- Описание / комментарии / подзадачи -->
                      <div class='d-flex align-items-center flex-wrap gap-2 text-secondary'>
                        <span v-if='card.description' title='Есть описание'>
                          <IconAlignLeft class='icon icon-inline' />
                        </span>
                        <span v-if='card.comments' title='Комментарии'>
                          <IconMessage class='icon icon-inline' />
                          {{ card.comments }}
                        </span>
                        <span v-if='card.subtasks' title='Подзадачи'>
                          <IconActivity class='icon icon-inline' />
                          {{ card.subtasks.done }}/{{ card.subtasks.total }}
                        </span>
                      </div>

                      <!-- Pull request-ы -->
                      <div class='d-flex flex-column gap-1 min-w-0'>
                        <div v-for='pr in card.pullRequests' :key='pr.id' class='d-flex align-items-center text-truncate'>
                          <component
                            :is='PR_ICON[pr.state]'
                            class='icon icon-inline flex-shrink-0 me-1'
                            :class='PR_COLOR[pr.state]'
                          />
                          <a
                            :href='pr.url'
                            target='_blank'
                            rel='noopener'
                            class='text-decoration-none text-truncate link-secondary'
                            @click.stop
                          >
                            <strong>#{{ pr.number }}</strong>&nbsp;{{ pr.repositoryName }}
                          </a>
                        </div>
                      </div>

                      <!-- Исполнители -->
                      <div>
                        <div v-if='card.assignees.length' class='avatar-list avatar-list-stacked avatar-list-xs'>
                          <span
                            v-for='user in card.assignees'
                            :key='user.name'
                            class='avatar avatar-xs'
                            :title='user.name'
                            :style='user.src ? { backgroundImage: `url(${user.src})` } : undefined'
                          >
                            <template v-if='!user.src'>{{ initials(user.name) }}</template>
                          </span>
                        </div>
                      </div>

                      <!-- Создана -->
                      <div class='text-secondary small text-end'>{{ card.createdAgo }}</div>
                    </div>
                  </VueDraggable>
                </template>
              </div>
            </VueDraggable>

            <!-- Новая колонка -->
            <div class='mt-3'>
              <div v-if='isAddingColumn' class='card card-sm'>
                <div class='card-body d-flex gap-2'>
                  <input
                    ref='newColumnInput'
                    v-model='newColumnTitle'
                    type='text'
                    class='form-control form-control-sm'
                    placeholder='Название колонки'
                    @keyup.enter='addColumn'
                    @keyup.esc='cancelAddColumn'
                  >
                  <button
                    type='button'
                    class='btn btn-primary btn-sm'
                    :disabled='!newColumnTitle.trim()'
                    @click='addColumn'
                  >
                    Добавить колонку
                  </button>
                  <button
                    type='button'
                    class='btn btn-ghost-secondary btn-sm btn-icon'
                    aria-label='Отмена'
                    @click='cancelAddColumn'
                  >
                    <IconX class='icon' />
                  </button>
                </div>
              </div>
              <button
                v-else
                type='button'
                class='btn btn-outline-secondary w-100 add-column-btn'
                @click='startAddColumn'
              >
                <IconPlus class='icon' />
                Добавить колонку
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- END PAGE BODY -->

  <!-- Модальное окно создания / редактирования задачи -->
  <Teleport to='body'>
    <template v-if='isIssueModalOpen && issueModal'>
      <div
        class='modal modal-blur d-block'
        tabindex='-1'
        role='dialog'
        aria-modal='true'
        aria-labelledby='issue-modal-title'
        @mousedown.self='closeIssueModal'
      >
        <div class='modal-dialog modal-xl' role='document'>
          <form class='modal-content' @submit.prevent='submitIssue'>
            <div class='modal-header'>
              <h5 v-if='issueModal.mode === "create"' id='issue-modal-title' class='modal-title'>
                Новая задача
                <span v-if='modalColumn' class='text-secondary fw-normal'>· {{ modalColumn.title }}</span>
              </h5>
              <!-- Редактирование: заголовок превращается в поле ввода по клику -->
              <div v-else class='flex-fill min-w-0 me-3'>
                <input
                  v-if='isEditingIssueTitle'
                  ref='issueTitleInputEl'
                  v-model='issueTitleDraft'
                  type='text'
                  class='form-control form-control-lg fw-bold'
                  aria-label='Название задачи'
                  autocomplete='off'
                  @keydown.enter.prevent='saveIssueTitle'
                  @blur='saveIssueTitle'
                >
                <h3
                  v-else
                  id='issue-modal-title'
                  class='modal-title issue-title text-break'
                  title='Нажмите, чтобы изменить'
                  @click='startEditIssueTitle'
                >
                  {{ issueModal.card.title }}
                </h3>
                <div v-if='issueModal.card.number' class='text-secondary small mt-1'>
                  <a
                    v-if='issueModal.card.url'
                    :href='issueModal.card.url'
                    target='_blank'
                    rel='noopener'
                    class='text-decoration-none link-secondary'
                  >
                    #{{ issueModal.card.number }}
                    <template v-if='issueModal.card.repositoryName'>&nbsp;{{ issueModal.card.repositoryName }}</template>
                  </a>
                  <template v-else>#{{ issueModal.card.number }}</template>
                </div>
              </div>
              <button type='button' class='btn-close' aria-label='Закрыть' @click='closeIssueModal' />
            </div>
            <div class='modal-body'>
              <div v-if='submitError' class='alert alert-danger' role='alert'>{{ submitError }}</div>
              <div class='row g-4'>
                <div class='col-md-9'>
                  <!-- Создание: обычная форма -->
                  <template v-if='issueModal.mode === "create"'>
                    <div class='mb-3'>
                      <label class='form-label required' for='issue-title-input'>Название</label>
                      <input
                        id='issue-title-input'
                        ref='titleInputEl'
                        v-model='formTitle'
                        type='text'
                        class='form-control'
                        placeholder='Название задачи'
                        autocomplete='off'
                        @keydown.ctrl.enter.prevent='submitIssue'
                        @keydown.meta.enter.prevent='submitIssue'
                      >
                    </div>
                    <div>
                      <label class='form-label' for='issue-description-input'>Описание</label>
                      <textarea
                        id='issue-description-input'
                        v-model='formDescription'
                        class='form-control'
                        rows='5'
                        placeholder='Подробности задачи (необязательно)'
                        @keydown.ctrl.enter.prevent='submitIssue'
                        @keydown.meta.enter.prevent='submitIssue'
                      />
                    </div>
                  </template>

                  <!-- Редактирование: описание отображается как markdown, «карандаш» включает редактор -->
                  <div v-else>
                    <div class='d-flex align-items-center mb-2'>
                      <span class='form-label mb-0 me-1'>Описание</span>
                      <button
                        v-if='!isEditingBody'
                        type='button'
                        class='btn btn-ghost-secondary btn-icon btn-sm'
                        aria-label='Редактировать описание'
                        title='Редактировать описание'
                        @click='startEditBody'
                      >
                        <IconPencil class='icon' />
                      </button>
                    </div>
                    <template v-if='isEditingBody'>
                      <textarea
                        ref='bodyInputEl'
                        v-model='bodyDraft'
                        class='form-control body-textarea'
                        placeholder='Описание в формате Markdown'
                        @input='autoGrow'
                        @keydown.ctrl.enter.prevent='saveBody'
                        @keydown.meta.enter.prevent='saveBody'
                      />
                      <div class='d-flex gap-2 mt-2'>
                        <button type='button' class='btn btn-primary btn-sm' @click='saveBody'>Сохранить</button>
                        <button type='button' class='btn btn-ghost-secondary btn-sm' @click='cancelEditBody'>Отмена</button>
                      </div>
                    </template>
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <div v-else-if='renderedBody' class='markdown issue-markdown' @click='onBodyClick' v-html='renderedBody' />
                    <button
                      v-else
                      type='button'
                      class='btn btn-ghost-secondary w-100 text-start text-secondary'
                      @click='startEditBody'
                    >
                      Добавить описание…
                    </button>
                  </div>
                </div>
                <div class='col-md-3'>
                  <div class='mb-4'>
                    <label class='form-label' :class='{ required: issueModal.mode === "create" }'>Репозиторий</label>
                    <template v-if='issueModal.mode === "create"'>
                      <div v-if='!repositories.length' class='text-danger small'>
                        К доске не подключено ни одного репозитория
                      </div>
                      <div v-else class='form-selectgroup d-flex flex-column align-items-stretch'>
                        <label v-for='repo in repositories' :key='repo.id' class='form-selectgroup-item'>
                          <input
                            v-model='formRepository'
                            type='radio'
                            name='repository'
                            :value='repo.fullName'
                            class='form-selectgroup-input'
                          >
                          <span class='form-selectgroup-label d-flex align-items-center'>
                            <span class='me-2 d-flex'><span class='form-selectgroup-check' /></span>
                            <span class='text-break'>{{ repo.fullName }}</span>
                          </span>
                        </label>
                      </div>
                    </template>
                    <div v-else>
                      <span class='badge bg-secondary-lt'>
                        {{ issueModal.card.repositoryFullName ?? issueModal.card.repositoryName ?? modalRepository }}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label class='form-label'>Исполнители</label>
                    <div v-if='isRepositoryMissing' class='text-secondary small'>Сначала выберите репозиторий</div>
                    <div v-else-if='isAssigneesLoading' class='text-secondary small'>
                      <span class='spinner-border spinner-border-sm me-2' />Загрузка пользователей…
                    </div>
                    <div v-else-if='assigneesError' class='text-danger small'>
                      {{ assigneesError }}
                      <a href='#' class='ms-1' @click.prevent='loadAssignableUsers'>Повторить</a>
                    </div>
                    <div v-else-if='!assigneeOptions.length' class='text-secondary small'>
                      Нет доступных пользователей
                    </div>
                    <div v-else class='form-selectgroup d-flex flex-column align-items-stretch'>
                      <label v-for='user in assigneeOptions' :key='user.login' class='form-selectgroup-item'>
                        <input
                          v-model='formAssignees'
                          type='checkbox'
                          name='assignees'
                          :value='user.login'
                          class='form-selectgroup-input'
                        >
                        <span class='form-selectgroup-label d-flex align-items-center'>
                          <span
                            class='avatar avatar-xs me-2'
                            :style='user.src ? { backgroundImage: `url(${user.src})` } : undefined'
                          >
                            <template v-if='!user.src'>{{ initials(user.login) }}</template>
                          </span>
                          {{ user.login }}
                        </span>
                      </label>
                    </div>
                  </div>
                  <div class='mt-4'>
                    <label class='form-label'>Метки</label>
                    <div v-if='isRepositoryMissing' class='text-secondary small'>Сначала выберите репозиторий</div>
                    <div v-else-if='isLabelsLoading' class='text-secondary small'>
                      <span class='spinner-border spinner-border-sm me-2' />Загрузка меток…
                    </div>
                    <div v-else-if='labelsError' class='text-danger small'>
                      {{ labelsError }}
                      <a href='#' class='ms-1' @click.prevent='loadLabels'>Повторить</a>
                    </div>
                    <div v-else-if='!labelOptions.length' class='text-secondary small'>
                      Нет доступных меток
                    </div>
                    <div v-else class='form-selectgroup d-flex flex-column'>
                      <label v-for='label in labelOptions' :key='label.name' class='form-selectgroup-item'>
                        <input
                          v-model='formLabels'
                          type='checkbox'
                          name='labels'
                          :value='label.name'
                          class='form-selectgroup-input'
                        >
                        <span
                          class='form-selectgroup-label d-flex align-items-center'
                          :title='label.description || undefined'
                        >
                          <span
                            class='me-2 flex-shrink-0 rounded-circle border'
                            :style='{ width: "0.75rem", height: "0.75rem", backgroundColor: label.color }'
                          />
                          {{ label.name }}
                        </span>
                      </label>
                    </div>
                  </div>
                  <div class='mt-4'>
                    <label class='form-label'>Цвет</label>
                    <div class='row g-2'>
                      <div v-for='color in CARD_COLORS' :key='color' class='col-auto'>
                        <label class='form-colorinput' :title='color'>
                          <!-- повторный клик по выбранному цвету сбрасывает его -->
                          <input
                            type='radio'
                            name='color'
                            :value='color'
                            :checked='formColor === color'
                            class='form-colorinput-input'
                            @click='formColor = formColor === color ? null : color'
                          >
                          <span class='form-colorinput-color' :class='`bg-${color}`' />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- У существующей задачи изменения сохраняются сразу, футер нужен только при создании -->
            <div v-if='issueModal.mode === "create"' class='modal-footer'>
              <button type='button' class='btn btn-link link-secondary me-auto' @click='closeIssueModal'>Отмена</button>
              <button type='submit' class='btn btn-primary' :disabled='!canSubmit'>
                Создать
              </button>
            </div>
          </form>
        </div>
      </div>
      <div class='modal-backdrop show' />
    </template>
  </Teleport>
</template>

<style scoped>
.kanban-board {
  overflow-x: auto;
}

.kanban-column {
  flex: 0 0 20rem;
  width: 20rem;
}
.kanban-column.is-collapsed {
  flex-basis: 3.5rem;
  width: 3.5rem;
}

.add-column-btn {
  border-style: dashed;
}

/* Колонка прокручивается по вертикали, если карточек много */
.kanban-scroll {
  --kanban-scroll-height: calc(100vh - 12.9rem);
  /* Колонка всегда занимает всю доступную высоту, чтобы карточку можно было бросить в любое её место */
  height: var(--kanban-scroll-height);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.25rem;
}

/* Список (он же зона drop) тянется на всю высоту колонки, даже если он пуст */
.kanban-list {
  min-height: calc(var(--kanban-scroll-height) - 0.5rem);
  align-content: flex-start; /* карточки остаются сверху, а не растягиваются по высоте */
}

.kanban-card-wrapper {
  background-color: transparent;
}

.kanban-card {
  cursor: grab;
}
.kanban-card:active {
  cursor: grabbing;
}

.card-description {
  overflow-wrap: anywhere;
}

.pr-list {
  border-top: 1px solid var(--tblr-border-color);
  padding-top: 0.8rem;
}
.pr-item + .pr-item {
  margin-top: 0.375rem;
}

.column-header {
  cursor: grab;
}
.column-header:active {
  cursor: grabbing;
}

.column-title {
  cursor: text;
  padding: 0.125rem 0.375rem;
  margin-left: -0.375rem;
  border-radius: var(--tblr-border-radius);
}
.column-title:hover {
  background-color: var(--tblr-bg-surface-secondary);
}

.column-title-input {
  font-size: 1.25rem;
  font-weight: 600;
  min-width: 0;
  flex: 1 1 auto;
}

.column-title-vertical {
  writing-mode: vertical-rl;
  white-space: nowrap;
  max-height: 20rem;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.kanban-ghost {
  opacity: 0.3;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

.kanban-chosen {
  border: none !important;
  outline: none !important;
}

.kanban-chosen.kanban-column {
  background-color: transparent;
}

.kanban-chosen .card {
  box-shadow: var(--tblr-box-shadow-dropdown);
  border-color: var(--tblr-border-color);
}

/* ---------- табличный вид ---------- */
.table-scroll {
  overflow-x: auto;
}
.table-inner {
  min-width: 60rem;
}

/* Общая сетка для заголовков и строк, чтобы столбцы совпадали во всех группах */
.table-row-grid {
  display: grid;
  grid-template-columns: minmax(16rem, 1fr) 10rem 8rem 12rem 7rem 6rem;
  column-gap: 1rem;
  align-items: start;
}

.min-w-0 {
  min-width: 0;
}

.group-header {
  cursor: grab;
  background-color: var(--tblr-bg-surface-secondary);
  border-radius: var(--tblr-border-radius) var(--tblr-border-radius) 0 0;
}
.group-header:active {
  cursor: grabbing;
}

/* Минимальная высота — чтобы можно было бросить строку в пустую группу */
.table-body {
  min-height: 2.5rem;
}

.table-row-item {
  border-top: 1px solid var(--tblr-border-color);
  cursor: grab;
}
.table-row-item:active {
  cursor: grabbing;
}
.table-row-item:hover {
  background-color: var(--tblr-bg-surface-secondary);
}

/* ---------- модальное окно задачи ---------- */
.issue-title {
  cursor: text;
  padding: 0.25rem 0.5rem;
  margin: -0.25rem -0.5rem;
  border-radius: var(--tblr-border-radius);
}
.issue-title:hover {
  background-color: var(--tblr-bg-surface-secondary);
}

.body-textarea {
  min-height: 8rem;
  resize: none;
  overflow: hidden;
}

.issue-markdown {
  overflow-wrap: anywhere;
}
.issue-markdown :deep(img) {
  max-width: 100%;
  height: auto;
}
.issue-markdown :deep(pre) {
  overflow-x: auto;
}
.issue-markdown :deep(.contains-task-list) {
  list-style: none;
  padding-left: 0.25rem;
}
.issue-markdown :deep(.task-checkbox) {
  margin: 0 0.5rem 0.15rem 0;
  vertical-align: middle;
  cursor: pointer;
}
</style>
