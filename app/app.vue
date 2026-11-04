<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import {
  IconPlus,
  IconCalendar,
  IconHeart,
  IconHeartFilled,
  IconMessage,
  IconShare,
  IconActivity,
  IconCheck,
  IconStar,
  IconGripVertical,
  IconX,
} from '@tabler/icons-vue'

interface Assignee {
  name: string
  src?: string // URL аватарки, если нет — показываем инициалы
}

interface ChecklistItem {
  id: number
  text: string
  done: boolean
}

interface Card {
  id: number
  title: string
  description?: string
  status?: 'red' | 'green' | 'blue' | 'yellow' | 'orange' | 'purple' // цветная полоска сверху
  starred?: boolean // закладка-лента в углу
  assignees?: Assignee[]
  dueDate?: string // ISO-дата
  liked?: boolean
  likes?: number
  comments?: number
  checklist?: ChecklistItem[]
}

interface Column {
  id: number
  title: string
  cards: Card[]
}

let nextId = 1000

const columns = ref<Column[]>([
  {
    id: 1,
    title: 'Ожидает',
    cards: [
      {
        id: 1,
        title: 'Улучшить email-рассылки',
        description: 'Пересмотреть сегментацию и шаблоны писем.',
        assignees: [{ name: 'Анна Ильина' }],
        dueDate: '2026-12-01',
        likes: 7,
        comments: 2,
      },
      {
        id: 2,
        title: 'Провести интервью с пользователями',
        status: 'yellow',
        dueDate: '2026-11-20',
        liked: true,
        likes: 34,
        comments: 4,
      },
      {
        id: 3,
        title: 'Спланировать квартальную встречу команды',
        assignees: [{ name: 'Максим Козлов' }, { name: 'Дарья Петрова' }, { name: 'Олег Смирнов' }],
        dueDate: '2026-12-20',
        liked: true,
        likes: 9,
      },
      {
        id: 4,
        title: 'Обновить документацию',
        assignees: [{ name: 'Олег Смирнов' }],
        dueDate: '2026-11-25',
        comments: 5,
      },
    ],
  },
  {
    id: 2,
    title: 'В работе',
    cards: [
      {
        id: 5,
        title: 'Внедрить новую аналитику',
        status: 'green',
        dueDate: '2026-11-10',
        comments: 11,
        checklist: [
          { id: 1, text: 'Реализовать новый дизайн', done: true },
          { id: 2, text: 'Юзабилити-тестирование', done: false },
          { id: 3, text: 'Доработать навигацию', done: false },
        ],
      },
      {
        id: 6,
        title: 'Запустить маркетинговую кампанию',
        description: 'Форма для определённой категории пользователей, которые будут выполнять действия.',
        starred: true,
        assignees: [{ name: 'Анна Ильина' }, { name: 'Дарья Петрова' }],
        dueDate: '2026-12-15',
        likes: 11,
        comments: 6,
      },
      {
        id: 7,
        title: 'Реализовать систему авторизации',
        description: 'Добавить OAuth и JWT.',
        status: 'red',
        assignees: [{ name: 'Анна Ильина' }, { name: 'Максим Козлов' }, { name: 'Олег Смирнов' }],
        dueDate: '2026-11-18',
        likes: 14,
        comments: 18,
      },
      {
        id: 8,
        title: 'Настроить пайплайн автотестов',
        status: 'blue',
        assignees: [{ name: 'Олег Смирнов' }, { name: 'Дарья Петрова' }, { name: 'Сергей Андреев' }],
        dueDate: '2026-11-30',
        likes: 16,
        comments: 20,
        checklist: [
          { id: 1, text: 'Настроить CI/CD', done: true },
          { id: 2, text: 'Написать unit-тесты', done: false },
          { id: 3, text: 'Подключить code coverage', done: false },
        ],
      },
    ],
  },
  {
    id: 3,
    title: 'Завершено',
    cards: [
      {
        id: 9,
        title: 'Оптимизировать производительность сайта',
        assignees: [{ name: 'Дарья Петрова' }],
        dueDate: '2026-10-15',
        likes: 1,
      },
      {
        id: 10,
        title: 'Разработать прототип мобильного приложения',
        description: 'Описание чуть длиннее, чем обычно.',
        assignees: [
          { name: 'Максим Козлов' },
          { name: 'Анна Ильина' },
          { name: 'Олег Смирнов' },
          { name: 'Дарья Петрова' },
        ],
        dueDate: '2026-10-10',
        liked: true,
        likes: 7,
        checklist: [
          { id: 1, text: 'Найти старые документы по договору', done: true },
          { id: 2, text: 'Встреча с отделом продаж', done: false },
          { id: 3, text: 'Проработать все детали', done: false },
        ],
      },
      {
        id: 11,
        title: 'Провести аудит безопасности',
        status: 'red',
        assignees: [{ name: 'Сергей Андреев' }, { name: 'Анна Ильина' }],
        dueDate: '2026-09-25',
        likes: 12,
        comments: 22,
      },
    ],
  },
])

// ---------- helpers ----------
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function initials(name: string) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function doneCount(card: Card) {
  return card.checklist?.filter(i => i.done).length ?? 0
}

function toggleLike(card: Card) {
  card.liked = !card.liked
  card.likes = Math.max(0, (card.likes ?? 0) + (card.liked ? 1 : -1))
}

function toggleChecklistItem(item: ChecklistItem) {
  item.done = !item.done
}

// ---------- добавление карточки ----------
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
  column.cards.push({ id: nextId++, title })
  cancelAdd()
}

// ---------- добавление колонки ----------
const isAddingColumn = ref(false)
const newColumnTitle = ref('')

function startAddColumn() {
  isAddingColumn.value = true
  newColumnTitle.value = ''
}

function cancelAddColumn() {
  isAddingColumn.value = false
  newColumnTitle.value = ''
}

function addColumn() {
  const title = newColumnTitle.value.trim()

  if (!title) return

  columns.value.push({
    id: nextId++,
    title,
    cards: [],
  })

  cancelAddColumn()
}

// Сюда можно повесить запросы к GraphQL
function onCardsChange(columnId: number) {
  // например: saveColumnOrder(columnId, column.cards.map(c => c.id))
  console.log('cards changed in column', columnId)
}
</script>

<template>
  <!-- BEGIN PAGE HEADER -->
  <div class="page-header d-print-none">
    <div class="container-xl">
      <div class="row g-2 align-items-center">
        <div class="col">
          <h1 class="page-title">Задачи</h1>
        </div>
        <div class="col-auto ms-auto d-print-none">
          <div v-if="isAddingColumn" class="d-flex gap-2">
            <input
              v-model="newColumnTitle"
              type="text"
              class="form-control"
              placeholder="Название колонки"
              autofocus
              @keyup.enter="addColumn"
              @keyup.esc="cancelAddColumn"
            />
            <button
              type="button"
              class="btn btn-primary"
              :disabled="!newColumnTitle.trim()"
              @click="addColumn"
            >
              Добавить
            </button>
            <button
              type="button"
              class="btn btn-ghost-secondary btn-icon"
              aria-label="Отмена"
              @click="cancelAddColumn"
            >
              <IconX class="icon" />
            </button>
          </div>
          <button
            v-else
            type="button"
            class="btn btn-primary"
            @click="startAddColumn"
          >
            <IconPlus class="icon" />
            Добавить колонку
          </button>
        </div>
      </div>
    </div>
  </div>
  <!-- END PAGE HEADER -->

  <!-- BEGIN PAGE BODY -->
  <div class="page-body">
    <div class="container-xl">
      <!-- Перетаскивание колонок (за иконку-ручку) -->
      <VueDraggable
        v-model="columns"
        class="row"
        handle=".column-handle"
        :animation="200"
        ghost-class="kanban-ghost"
      >
        <div v-for="column in columns" :key="column.id" class="col-12 col-md-6 col-lg">
          <div class="d-flex align-items-center mb-3">
            <span class="column-handle text-secondary me-2" title="Перетащить колонку">
              <IconGripVertical class="icon" />
            </span>
            <h2 class="mb-0">{{ column.title }}</h2>
            <span class="badge bg-secondary-lt ms-2">{{ column.cards.length }}</span>
          </div>

          <div class="mb-4">
            <!-- Перетаскивание карточек между колонками -->
            <VueDraggable
              v-model="column.cards"
              class="row row-cards kanban-list"
              group="cards"
              :animation="150"
              ghost-class="kanban-ghost"
              chosen-class="kanban-chosen"
              @add="onCardsChange(column.id)"
              @update="onCardsChange(column.id)"
            >
              <div v-for="card in column.cards" :key="card.id" class="kanban-card-wrapper col-12">
                <div class="card card-sm kanban-card">
                  <!-- Цветная полоска сверху -->
                  <div v-if="card.status" class="card-status-top" :class="`bg-${card.status}`"></div>

                  <!-- Закладка -->
                  <div v-if="card.starred" class="ribbon ribbon-top ribbon-bookmark bg-yellow">
                    <IconStar class="icon" />
                  </div>

                  <div class="card-body">
                    <h2 class="card-title">{{ card.title }}</h2>

                    <div v-if="card.description" class="text-secondary">{{ card.description }}</div>

                    <div class="mt-4">
                      <div class="row">
                        <!-- Исполнители -->
                        <div class="col">
                          <div v-if="card.assignees?.length" class="avatar-list avatar-list-stacked avatar-list-xs">
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

                        <!-- Срок -->
                        <div v-if="card.dueDate" class="col-auto">
                          <a href="#" class="link-warning" @click.prevent>
                            <IconCalendar class="icon icon-inline" />
                            {{ formatDate(card.dueDate) }}
                          </a>
                        </div>

                        <!-- Лайк -->
                        <div class="col-auto text-secondary">
                          <button
                            class="switch-icon switch-icon-scale"
                            :class="{ active: card.liked }"
                            aria-label="В избранное"
                            :aria-pressed="!!card.liked"
                            @click="toggleLike(card)"
                          >
                            <span class="switch-icon-a text-muted">
                              <IconHeart class="icon" />
                            </span>
                            <span class="switch-icon-b text-red">
                              <IconHeartFilled class="icon icon-filled" />
                            </span>
                          </button>
                          <template v-if="card.likes">{{ card.likes }}</template>
                        </div>

                        <!-- Прогресс чек-листа -->
                        <div v-if="card.checklist?.length" class="col-auto">
                          <a href="#" class="link-secondary" @click.prevent>
                            <IconActivity class="icon icon-inline" />
                            {{ doneCount(card) }}/{{ card.checklist.length }}
                          </a>
                        </div>

                        <!-- Комментарии -->
                        <div v-if="card.comments" class="col-auto">
                          <a href="#" class="link-secondary" @click.prevent>
                            <IconMessage class="icon icon-inline" />
                            {{ card.comments }}
                          </a>
                        </div>

                        <!-- Поделиться -->
                        <div class="col-auto">
                          <a href="#" class="link-secondary" aria-label="Поделиться" @click.prevent>
                            <IconShare class="icon icon-inline" />
                          </a>
                        </div>
                      </div>
                    </div>

                    <!-- Чек-лист -->
                    <div v-if="card.checklist?.length" class="divide-y-2 mt-4">
                      <div
                        v-for="item in card.checklist"
                        :key="item.id"
                        class="checklist-item"
                        @click="toggleChecklistItem(item)"
                      >
                        <IconCheck class="icon icon-inline" :class="item.done ? 'text-muted' : 'text-green'" />
                        <span v-if="item.done" class="text-secondary text-decoration-line-through">
                          {{ item.text }}
                        </span>
                        <template v-else>{{ item.text }}</template>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </VueDraggable>

            <!-- Добавление карточки -->
            <div class="mt-3">
              <div v-if="addingTo === column.id">
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
              <button v-else class="btn btn-ghost-secondary w-100" @click="startAdd(column.id)">
                <IconPlus class="icon" />
                Добавить задачу
              </button>
            </div>
          </div>
        </div>
      </VueDraggable>
    </div>
  </div>
  <!-- END PAGE BODY -->
</template>

<style scoped>
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

.column-handle {
  display: inline-flex;
  cursor: grab;
}
.column-handle:active {
  cursor: grabbing;
}

.checklist-item {
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
