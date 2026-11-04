<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import { IconPlus, IconGripVertical, IconX } from '@tabler/icons-vue'

interface Card {
  id: number
  title: string
  tag?: { label: string; color: string }
  assignee?: string
}

interface Column {
  id: number
  title: string
  cards: Card[]
}

let nextId = 100

const columns = ref<Column[]>([
  {
    id: 1,
    title: 'К выполнению',
    cards: [
      { id: 1, title: 'Спроектировать схему БД', tag: { label: 'Backend', color: 'blue' }, assignee: 'АИ' },
      { id: 2, title: 'Нарисовать макеты главной', tag: { label: 'Design', color: 'purple' }, assignee: 'МК' },
      { id: 3, title: 'Настроить CI/CD', tag: { label: 'DevOps', color: 'orange' } },
    ],
  },
  {
    id: 2,
    title: 'В работе',
    cards: [
      { id: 4, title: 'Авторизация через GraphQL', tag: { label: 'Backend', color: 'blue' }, assignee: 'ДП' },
      { id: 5, title: 'Компонент канбан-доски', tag: { label: 'Frontend', color: 'green' }, assignee: 'АИ' },
    ],
  },
  {
    id: 3,
    title: 'Готово',
    cards: [
      { id: 6, title: 'Инициализация проекта Nuxt 4', tag: { label: 'Frontend', color: 'green' }, assignee: 'МК' },
    ],
  },
])

// --- добавление карточки ---
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

function removeCard(column: Column, cardId: number) {
  column.cards = column.cards.filter(c => c.id !== cardId)
}

// --- добавление колонки ---
function addColumn() {
  columns.value.push({ id: nextId++, title: 'Новая колонка', cards: [] })
}
</script>

<template>
  <div class="page-header d-print-none">
    <div class="container-xl">
      <div class="row g-2 align-items-center">
        <div class="col">
          <div class="page-pretitle">Проект</div>
          <h2 class="page-title">Канбан-доска</h2>
        </div>
        <div class="col-auto">
          <button class="btn btn-primary" @click="addColumn">
            <IconPlus class="icon" />
            Добавить колонку
          </button>
        </div>
      </div>
    </div>
  </div>

  <div class="page-body">
    <div class="container-fluid">
      <!-- Перетаскивание колонок -->
      <VueDraggable
        v-model="columns"
        class="kanban-board"
        :animation="200"
        handle=".column-handle"
        ghost-class="kanban-ghost"
        item-key="id"
      >
        <div v-for="column in columns" :key="column.id" class="kanban-column">
          <div class="card bg-muted-lt">
            <div class="card-header py-2">
              <span class="column-handle me-2 text-secondary" title="Перетащить колонку">
                <IconGripVertical class="icon" />
              </span>
              <h3 class="card-title">{{ column.title }}</h3>
              <div class="card-actions">
                <span class="badge bg-secondary-lt">{{ column.cards.length }}</span>
              </div>
            </div>

            <div class="card-body p-2">
              <!-- Перетаскивание карточек между колонками -->
              <VueDraggable
                v-model="column.cards"
                group="cards"
                class="kanban-cards"
                :animation="150"
                ghost-class="kanban-ghost"
                drag-class="kanban-drag"
              >
                <div
                  v-for="card in column.cards"
                  :key="card.id"
                  class="card card-sm mb-2 kanban-card"
                >
                  <div class="card-body">
                    <div class="d-flex align-items-start">
                      <div class="flex-fill">
                        <span
                          v-if="card.tag"
                          class="badge mb-2"
                          :class="`bg-${card.tag.color}-lt`"
                        >
                          {{ card.tag.label }}
                        </span>
                        <div class="fw-medium">{{ card.title }}</div>
                      </div>
                      <button
                        class="btn-close ms-2"
                        aria-label="Удалить"
                        @click="removeCard(column, card.id)"
                      />
                    </div>
                    <div v-if="card.assignee" class="mt-3 d-flex justify-content-end">
                      <span class="avatar avatar-xs rounded">{{ card.assignee }}</span>
                    </div>
                  </div>
                </div>
              </VueDraggable>

              <!-- Форма добавления -->
              <div v-if="addingTo === column.id" class="mt-2">
                <input
                  v-model="newTitle"
                  type="text"
                  class="form-control mb-2"
                  placeholder="Название карточки"
                  autofocus
                  @keyup.enter="addCard(column)"
                  @keyup.esc="cancelAdd"
                />
                <div class="d-flex gap-2">
                  <button class="btn btn-primary btn-sm" @click="addCard(column)">Добавить</button>
                  <button class="btn btn-ghost-secondary btn-sm btn-icon" @click="cancelAdd">
                    <IconX class="icon" />
                  </button>
                </div>
              </div>
            </div>

            <div v-if="addingTo !== column.id" class="card-footer p-2">
              <button class="btn btn-ghost-secondary w-100" @click="startAdd(column.id)">
                <IconPlus class="icon" />
                Добавить карточку
              </button>
            </div>
          </div>
        </div>
      </VueDraggable>
    </div>
  </div>
</template>

<style scoped>
.kanban-board {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: 1rem;
}

.kanban-column {
  flex: 0 0 320px;
  width: 320px;
}

/* min-height нужен, чтобы в пустую колонку можно было бросить карточку */
.kanban-cards {
  min-height: 60px;
}

.kanban-card {
  cursor: grab;
}
.kanban-card:active {
  cursor: grabbing;
}

.column-handle {
  cursor: grab;
  display: inline-flex;
}

.kanban-ghost {
  opacity: 0.4;
}

.kanban-drag {
  transform: rotate(2deg);
  box-shadow: var(--tblr-box-shadow-dropdown);
}
</style>
