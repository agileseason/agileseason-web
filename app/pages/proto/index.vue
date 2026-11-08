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
  IconX,
  IconChevronsLeft,
  IconChevronsRight,
  IconRefresh,
} from '@tabler/icons-vue'
import { fetchBoard, moveIssue } from '~/api/board'
import { mapBoard } from '~/utils/board'
import type { Card, Column } from '~/types/board'

const BOARD_ID = 42

// ---------- загрузка данных ----------
const boardName = ref('Задачи')
const repositoryName = ref('')
const columns = ref<Column[]>([])
const isLoading = ref(true)
const loadError = ref('')

async function load() {
  isLoading.value = true
  loadError.value = ''
  try {
    const board = await fetchBoard(BOARD_ID)
    boardName.value = board.name
    repositoryName.value = board.repositories[0]?.fullName ?? ''
    columns.value = mapBoard(board)
  } catch (e) {
    console.error(e)
    loadError.value = 'Не удалось загрузить доску'
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

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
  closed: 'text-secondary',
}

const PR_TITLE: Record<string, string> = {
  open: 'открыт',
  merged: 'влит',
  closed: 'закрыт',
}

const PR_BADGE: Record<string, string> = {
  open: 'bg-green-lt',
  merged: 'bg-purple-lt',
  closed: 'bg-secondary-lt',
}


// ---------- добавление карточки ----------
let nextId = -1 // локальные (ещё не сохранённые) карточки имеют отрицательные id
const addingTo = ref<number | null>(null)
const newTitle = ref('')

function startAdd(columnId: number) {
  addingTo.value = columnId
  newTitle.value = ''
}

function cancelAdd() {
  addingTo.value = null
  newTitle.value = ''
}

function addCard(column: Column) {
  const title = newTitle.value.trim()
  if (!title) return
  // TODO: заменить на мутацию создания issue, id взять из ответа
  column.cards.push({
    id: nextId--,
    title,
    labels: [],
    assignees: [],
    comments: 0,
    pullRequests: [],
    isClosed: false,
  })
  cancelAdd()
}

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
    if (addingTo.value === column.id) cancelAdd()
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
  <div class="page-header d-print-none">
    <div class="container-fluid">
      <div class="row g-2 align-items-center">
        <div class="col">
          <div v-if="repositoryName" class="page-pretitle">{{ repositoryName }}</div>
          <h1 class="page-title">{{ boardName }}</h1>
        </div>
        <div class="col-auto">
          <button
            type="button"
            class="btn btn-ghost-secondary btn-icon"
            aria-label="Обновить"
            title="Обновить"
            :disabled="isLoading"
            @click="load"
          >
            <IconRefresh class="icon" />
          </button>
        </div>
      </div>
    </div>
  </div>
  <!-- END PAGE HEADER -->

  <!-- BEGIN PAGE BODY -->
  <div class="page-body">
    <div class="container-fluid">
      <!-- Загрузка -->
      <div v-if="isLoading && !columns.length" class="text-center text-secondary py-6">
        <div class="spinner-border mb-3" role="status"></div>
        <div>Загружаем доску…</div>
      </div>

      <!-- Ошибка -->
      <div v-else-if="loadError" class="alert alert-danger" role="alert">
        {{ loadError }}
        <button type="button" class="btn btn-sm btn-danger ms-3" @click="load">Повторить</button>
      </div>

      <!-- Доска -->
      <div v-else class="kanban-board d-flex align-items-start gap-3 pb-3">
        <!-- Перетаскивание колонок (за заголовок) -->
        <VueDraggable
          v-model="columns"
          class="d-flex align-items-start gap-3"
          handle=".column-header"
          :animation="200"
          ghost-class="kanban-ghost"
        >
          <div
            v-for="column in columns"
            :key="column.id"
            class="kanban-column"
            :class="{ 'is-collapsed': column.collapsed }"
          >
            <!-- Свёрнутая колонка -->
            <div v-if="column.collapsed" class="card card-sm">
              <div
                class="card-body column-header d-flex flex-column align-items-center gap-2 px-0"
                title="Перетащить колонку"
              >
                <span class="badge bg-secondary-lt">{{ column.cards.length }}</span>
                <h2 class="mb-0 column-title-vertical" title="Развернуть колонку" @click="toggleCollapse(column)">
                  {{ column.title }}
                </h2>
                <button
                  type="button"
                  class="btn btn-ghost-secondary btn-icon btn-sm"
                  aria-label="Развернуть колонку"
                  title="Развернуть колонку"
                  @click="toggleCollapse(column)"
                >
                  <IconChevronsRight class="icon" />
                </button>
              </div>
            </div>

            <template v-else>
              <div class="column-header d-flex align-items-center mb-3" title="Перетащить колонку">
                <span class="badge bg-secondary-lt me-2">{{ column.cards.length }}</span>
                <input
                  v-if="editingColumnId === column.id"
                  :ref="(el) => setTitleInput(column.id, el)"
                  v-model="editingTitle"
                  type="text"
                  class="form-control form-control-sm column-title-input"
                  @keyup.enter="saveTitle(column)"
                  @keyup.esc="cancelEditTitle"
                  @blur="saveTitle(column)"
                />
                <h2
                  v-else
                  class="mb-0 column-title text-truncate"
                  title="Нажмите, чтобы переименовать"
                  @click="startEditTitle(column)"
                >
                  {{ column.title }}
                </h2>

                <IconCircleCheck
                  v-if="column.isAutoClose"
                  class="icon ms-2 text-green flex-shrink-0"
                  title="Задачи в этой колонке закрываются автоматически"
                />

                <div class="ms-auto d-flex flex-shrink-0">
                  <button
                    type="button"
                    class="btn btn-ghost-secondary btn-icon btn-sm"
                    aria-label="Свернуть колонку"
                    title="Свернуть колонку"
                    @click="toggleCollapse(column)"
                  >
                    <IconChevronsLeft class="icon" />
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost-secondary btn-icon btn-sm"
                    aria-label="Добавить задачу"
                    title="Добавить задачу"
                    @click="startAdd(column.id)"
                  >
                    <IconPlus class="icon" />
                  </button>
                </div>
              </div>

              <div class="mb-4">
                <!-- Добавление карточки -->
                <div v-if="addingTo === column.id" class="mb-3">
                  <input
                    v-model="newTitle"
                    type="text"
                    class="form-control mb-2"
                    placeholder="Название задачи"
                    autofocus
                    @keyup.enter="addCard(column)"
                    @keyup.esc="cancelAdd"
                  />
                  <div class="d-flex gap-2">
                    <button class="btn btn-primary btn-sm" @click="addCard(column)">Добавить</button>
                    <button class="btn btn-ghost-secondary btn-sm btn-icon" aria-label="Отмена" @click="cancelAdd">
                      <IconX class="icon" />
                    </button>
                  </div>
                </div>

                <!-- Список карточек с вертикальной прокруткой (в Done их много) -->
                <div class="kanban-scroll">
                  <VueDraggable
                    v-model="column.cards"
                    class="row row-cards kanban-list"
                    group="cards"
                    :animation="150"
                    ghost-class="kanban-ghost"
                    chosen-class="kanban-chosen"
                    @add="onCardsChange(column, $event)"
                    @update="onCardsChange(column, $event)"
                  >
                    <div v-for="card in column.cards" :key="card.id" class="kanban-card-wrapper col-12">
                      <div class="card card-sm kanban-card">
                        <!-- Цветная полоска сверху (по типу задачи) -->
                        <div v-if="card.status" class="card-status-top" :class="`bg-${card.status}`"></div>

                        <div class="card-body">
                          <div class="d-flex align-items-start gap-2">
                            <h2 class="card-title mb-0 flex-fill">{{ card.title }}</h2>
                            <IconCircleCheck
                              v-if="card.isClosed"
                              class="icon icon-inline text-green flex-shrink-0"
                              title="Закрыта"
                            />
                          </div>

                          <!-- Описание пока скрыто
                          <div v-if="card.description" class="text-secondary mt-2 card-description">
                            {{ card.description }}
                          </div>
                          -->

                          <!-- Номер задачи, репозиторий и время создания -->
                          <div
                            v-if="card.number || card.createdAgo"
                            class="d-flex align-items-center justify-content-between gap-2 mt-2"
                          >
                            <div v-if="card.number" class="text-truncate">
                              <a
                                v-if="card.url"
                                :href="card.url"
                                target="_blank"
                                rel="noopener"
                                class="text-decoration-none link-secondary"
                                @click.stop
                              >
                                <strong>#{{ card.number }}</strong>
                                <span v-if="card.repositoryName">&nbsp;{{ card.repositoryName }}</span>
                              </a>
                              <strong v-else>#{{ card.number }}</strong>
                            </div>
                            <span v-if="card.createdAgo" class="text-secondary small ms-auto flex-shrink-0" title="Создана">
                              {{ card.createdAgo }}
                            </span>
                          </div>

                          <!-- Метки -->
                          <div v-if="card.labels.length" class="d-flex flex-wrap gap-1 mt-3">
                            <span
                              v-for="label in card.labels"
                              :key="label.name"
                              class="badge"
                              :style="{ backgroundColor: label.color, color: label.textColor }"
                            >
                              {{ label.name }}
                            </span>
                          </div>

                          <!-- Прогресс подзадач -->
                          <div v-if="card.subtasks" class="mt-3">
                            <div class="progress">
                              <div
                                class="progress-bar"
                                role="progressbar"
                                :style="{ width: `${subtasksPercent(card)}%` }"
                              ></div>
                            </div>
                          </div>

                          <div class="mt-3">
                            <div class="row align-items-center g-2">
                              <!-- Есть описание -->
                              <div v-if="card.description" class="col-auto">
                                <span class="text-secondary" title="Есть описание">
                                  <IconAlignLeft class="icon icon-inline" />
                                </span>
                              </div>

                              <!-- Комментарии -->
                              <div v-if="card.comments" class="col-auto">
                                <span class="text-secondary" title="Комментарии">
                                  <IconMessage class="icon icon-inline" />
                                  {{ card.comments }}
                                </span>
                              </div>

                              <!-- Подзадачи -->
                              <div v-if="card.subtasks" class="col-auto">
                                <span class="text-secondary" title="Подзадачи">
                                  <IconActivity class="icon icon-inline" />
                                  {{ card.subtasks.done }}/{{ card.subtasks.total }}
                                </span>
                              </div>

                              <!-- Исполнители (всегда справа) -->
                              <div v-if="card.assignees.length" class="col-auto ms-auto">
                                <div class="avatar-list avatar-list-stacked avatar-list-xs">
                                  <span
                                    v-for="user in card.assignees"
                                    :key="user.name"
                                    class="avatar avatar-xs"
                                    :title="user.name"
                                    :style="user.src ? { backgroundImage: `url(${user.src})` } : undefined"
                                  >
                                    <template v-if="!user.src">{{ initials(user.name) }}</template>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <!-- Pull request-ы -->
                          <ul v-if="card.pullRequests.length" class="list-unstyled mt-3 mb-0 pr-list">
                            <li
                              v-for="pr in card.pullRequests"
                              :key="pr.id"
                              class="d-flex align-items-center justify-content-between pr-item"
                            >
															<div>
																<IconGitPullRequest
																	class="icon icon-inline flex-shrink-0 me-1"
																	:class="PR_COLOR[pr.state]"
																/>
																<a
																	:href="pr.url"
																	target="_blank"
																	rel="noopener"
																	class="text-decoration-none text-truncate link-secondary"
																	:title="`PR #${pr.number} — ${PR_TITLE[pr.state]}`"
																	@click.stop
																>
																	<strong>#{{ pr.number }}</strong>&nbsp;{{ pr.repositoryName }}
																</a>
															</div>
                              <div
                                v-if="pr.assignees?.length"
                                class="avatar-list avatar-list-stacked avatar-list-xs flex-shrink-0"
                              >
                                <span
                                  v-for="user in pr.assignees"
                                  :key="user.name"
                                  class="avatar avatar-xs"
                                  :title="user.name"
                                  :style="user.src ? { backgroundImage: `url(${user.src})` } : undefined"
                                >
                                  <template v-if="!user.src">{{ initials(user.name) }}</template>
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
        <div class="kanban-column">
          <div v-if="isAddingColumn" class="card card-sm">
            <div class="card-body">
              <input
                ref="newColumnInput"
                v-model="newColumnTitle"
                type="text"
                class="form-control mb-2"
                placeholder="Название колонки"
                @keyup.enter="addColumn"
                @keyup.esc="cancelAddColumn"
              />
              <div class="d-flex gap-2">
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  :disabled="!newColumnTitle.trim()"
                  @click="addColumn"
                >
                  Добавить колонку
                </button>
                <button
                  type="button"
                  class="btn btn-ghost-secondary btn-sm btn-icon"
                  aria-label="Отмена"
                  @click="cancelAddColumn"
                >
                  <IconX class="icon" />
                </button>
              </div>
            </div>
          </div>
          <button
            v-else
            type="button"
            class="btn btn-outline-secondary w-100 add-column-btn"
            @click="startAddColumn"
          >
            <IconPlus class="icon" />
            Добавить колонку
          </button>
        </div>
      </div>
    </div>
  </div>
  <!-- END PAGE BODY -->
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
  max-height: calc(100vh - 16rem);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.25rem;
}

/* Минимальная высота нужна, чтобы можно было бросить карточку в пустую колонку */
.kanban-list {
  min-height: 4rem;
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
  opacity: 0.4;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

.kanban-chosen {
  border: none !important;
  outline: none !important;
}

.kanban-chosen .card {
  box-shadow: var(--tblr-box-shadow-dropdown);
  border-color: var(--tblr-border-color);
}
</style>
