<!-- app/pages/boards/index.vue -->
<script setup lang="ts">
useHead({ title: 'Доски' })

const MAX_AVATARS = 5

const { data: currentUser, status, error } = useCurrentUser()
const isLoading = computed(() => status.value === 'idle' || status.value === 'pending')
const cards = computed(() => (currentUser.value?.boards ?? []).map(buildBoardCard))
</script>

<template>
  <!-- BEGIN PAGE HEADER -->
  <div class='page-header d-print-none'>
    <div class='container-fluid'>
      <h1 class='page-title'>Доски</h1>
    </div>
  </div>
  <!-- END PAGE HEADER -->

  <!-- BEGIN PAGE BODY -->
  <div class='page-body'>
    <div class='container-fluid'>
      <div v-if='error' class='alert alert-danger' role='alert'>Не удалось загрузить список досок</div>

      <div v-else-if='isLoading' class='text-center py-5'>
        <div class='spinner-border text-primary' role='status'>
          <span class='visually-hidden'>Загрузка…</span>
        </div>
      </div>

      <div v-else-if='!cards.length' class='empty'>
        <p class='empty-title'>Досок пока нет</p>
      </div>

      <div v-else class='row row-cards'>
        <div v-for='card in cards' :key='card.board.id' class='col-sm-12 col-md-6 col-lg-4 col-xl-3'>
          <NuxtLink :to='`/boards/${card.board.id}`' class='card card-link card-link-pop h-100 text-reset'>
            <div class='card-body d-flex flex-column'>
              <!-- Название и пометки -->
              <div class='d-flex justify-content-between align-items-start gap-2 mb-2'>
                <h3 class='card-title mb-0'>{{ card.board.name }}</h3>
                <div class='d-flex flex-wrap justify-content-end gap-1 flex-shrink-0'>
                  <!--div v-if='card.board.isOwner' class='badge badge-outline text-secondary'>Владелец, TODO: Заменить на иконку шестиренки, чтобы потом добавить страницу с настройками доски</div-->
                  <!--div v-if='card.isStale' class='badge bg-secondary-lt'>Нет активности</div-->
                </div>
              </div>

              <!-- Репозитории -->
              <div v-if='card.repositories.length' class='d-flex flex-wrap gap-1 mb-3'>
                <span
                  v-for='repository in card.repositories'
                  :key='repository.fullName'
                  class='badge bg-secondary-lt'
                  :title='repository.fullName'
                >
                  {{ repository.name }}
                </span>
                <span v-if='card.hiddenRepositoriesCount' class='badge bg-secondary-lt'>
                  +{{ card.hiddenRepositoriesCount }}
                </span>
              </div>

              <!-- Открытые задачи по колонкам -->
              <div class='progress progress-separated mb-2' role='img' aria-label='Открытые задачи по колонкам'>
                <div
                  v-for='segment in card.segments'
                  :key='segment.id'
                  class='progress-bar bg-primary'
                  :style='{ width: `${segment.issuesCount / card.total * 100}%`, minWidth: "4px", opacity: segment.opacity }'
                  :title='`${segment.name}: ${segment.issuesCount}`'
                />
              </div>
              <div class='d-flex flex-wrap column-gap-3 row-gap-1 small text-secondary mb-2'>
                <template v-if='card.segments.length'>
                  <span v-for='segment in card.legend' :key='segment.id'>
                    <span class='legend me-1 bg-primary' :style='{ opacity: segment.opacity }' />{{ segment.name }}
                    <strong class='text-body'>{{ segment.issuesCount }}</strong>
                  </span>
                  <span v-if='card.hiddenColumnsCount'>ещё {{ card.hiddenColumnsCount }}</span>
                </template>
                <span v-else>Нет открытых задач</span>
              </div>

              <!-- Цифры -->
              <div class='row g-2 mt-auto pt-3 border-top'>
                <div class='col-4'>
                  <div class='h3 mb-0'>{{ card.board.stats.openIssuesCount }}</div>
                  <div class='text-secondary small'>Открыто</div>
                </div>
                <div class='col-4'>
                  <div class='h3 mb-0'>{{ card.board.stats.myOpenIssuesCount }}</div>
                  <div class='text-secondary small'>Мои задачи</div>
                </div>
                <div class='col-4'>
                  <div class='h3 mb-0'>{{ card.board.stats.closedIssuesLastWeekCount }}</div>
                  <div class='text-secondary small'>Закрыто за неделю</div>
                </div>
              </div>

              <!-- Участники и активность -->
              <div class='d-flex justify-content-between align-items-center gap-2 mt-3'>
                <div v-if='card.board.users.length' class='avatar-list'>
                  <span
                    v-for='user in card.board.users.slice(0, MAX_AVATARS)'
                    :key='user.login'
                    class='avatar avatar-xs rounded-circle'
                    :style='{ backgroundImage: `url("${user.avatarUrl}")` }'
                    :title='user.login'
                  />
                  <span
                    v-if='card.board.users.length > MAX_AVATARS'
                    class='avatar avatar-xs rounded-circle'
                    :title='card.board.users.slice(MAX_AVATARS).map(u => u.login).join(", ")'
                  >
                    +{{ card.board.users.length - MAX_AVATARS }}
                  </span>
                </div>
                <span v-else class='text-secondary small'>Нет участников</span>

                <span class='text-secondary small text-end'>
                  {{ card.board.stats.lastActivityAt ? `Активность ${timeAgo(card.board.stats.lastActivityAt)}` : 'Активности ещё не было' }}
                </span>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
  <!-- END PAGE BODY -->
</template>
