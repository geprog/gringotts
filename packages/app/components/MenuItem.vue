<template>
  <NuxtLink :to="to">
    <span>{{ title }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps({
  title: String,
  icon: String,
  to: String,
});
</script>
