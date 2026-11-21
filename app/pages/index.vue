<!-- app/pages/index.vue -->
<script setup lang="ts">
useHead({ title: 'AgileSeason' });
</script>

<template>
  <div class='page-body'>
    <div class='container-fluid text-center py-5'>
      <h1>AgileSeason</h1>
      <NuxtLink to='/boards/42' class='btn btn-primary mt-3'>
        Перейти к доске
      </NuxtLink>
    </div>
  </div>
</template>

