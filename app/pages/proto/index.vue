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
} from '@tabler/icons-vue'
import { fetchBoard, moveIssue } from '~/api/board'
import { mapBoard } from '~/utils/board'
import type { Card, Column } from '~/types/board'

const BOARD_ID = 42

// ---------- загрузка данных ----------
const boardName = ref('Задачи')
const columns = ref<Column[]>([])
const isLoading = ref(true)
const loadError = ref('')

async function load() {
  isLoading.value = true
  loadError.value = ''
  try {
    const board = await fetchBoard(BOARD_ID)
    boardName.value = board.name
    columns.value = mapBoard(board)
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
  closeIssueModal()
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

// колонка, в которую создаём задачу (только в режиме создания)
const modalColumn = computed(() => {
  const modal = issueModal.value
  if (modal?.mode !== 'create') return null
  return columns.value.find(c => c.id === modal.columnId) ?? null
})

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
  focusTitle()
}

function openEdit(card: Card) {
  issueModal.value = { mode: 'edit', card }
  formTitle.value = card.title
  formDescription.value = card.description ?? ''
  focusTitle(true)
}

function closeIssueModal() {
  issueModal.value = null
  formTitle.value = ''
  formDescription.value = ''
}

function submitIssue() {
  const modal = issueModal.value
  const title = formTitle.value.trim()
  if (!modal || !title) return
  const description = formDescription.value.trim()

  if (modal.mode === 'create') {
    const column = modalColumn.value
    if (!column) return
    // TODO: заменить на мутацию создания issue, id взять из ответа
    column.cards.unshift({
      id: nextId--,
      title,
      description: description || undefined,
      labels: [],
      assignees: [],
      comments: 0,
      pullRequests: [],
      isClosed: false,
    })
    column.collapsed = false // чтобы новая задача сразу была видна
  } else {
    // TODO: мутация updateIssue(card.id, { title, description }); при ошибке откатить изменения
    modal.card.title = title
    modal.card.description = description || undefined
  }
  closeIssueModal()
}

// блокируем прокрутку страницы под открытым модальным окном
watch(isIssueModalOpen, (open) => {
  document.body.classList.toggle('modal-open', open)
})
onBeforeUnmount(() => document.body.classList.remove('modal-open'))

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
        @keyup.esc='closeIssueModal'
      >
        <div class='modal-dialog modal-dialog-centered' role='document'>
          <form class='modal-content' @submit.prevent='submitIssue'>
            <div class='modal-header'>
              <h5 id='issue-modal-title' class='modal-title'>
                <template v-if='issueModal.mode === "create"'>
                  Новая задача
                  <span v-if='modalColumn' class='text-secondary fw-normal'>· {{ modalColumn.title }}</span>
                </template>
                <template v-else>
                  Редактирование задачи
                  <span v-if='issueModal.card.number' class='text-secondary fw-normal'>
                    · #{{ issueModal.card.number }}
                  </span>
                </template>
              </h5>
              <button type='button' class='btn-close' aria-label='Закрыть' @click='closeIssueModal' />
            </div>
            <div class='modal-body'>
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
            </div>
            <div class='modal-footer'>
              <button type='button' class='btn btn-link link-secondary me-auto' @click='closeIssueModal'>Отмена</button>
              <button type='submit' class='btn btn-primary' :disabled='!formTitle.trim()'>
                {{ issueModal.mode === 'create' ? 'Создать' : 'Сохранить' }}
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
</style>
