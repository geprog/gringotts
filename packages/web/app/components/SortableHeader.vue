<template>
  <UButton
    color="neutral"
    variant="ghost"
    :label="props.label"
    :icon="
      props.column.getIsSorted() === 'asc'
        ? 'i-lucide-arrow-up-narrow-wide'
        : props.column.getIsSorted() === 'desc'
        ? 'i-lucide-arrow-down-wide-narrow'
        : 'i-lucide-arrow-up-down'
    "
    class="-mx-2.5"
    :aria-label="`Sort by ${
      props.column.getIsSorted() === 'asc'
        ? 'descending'
        : props.column.getIsSorted() === 'desc'
        ? 'unsorted'
        : 'ascending'
    }`"
    @click="handleClick"
  />
</template>

<script setup lang="ts">
import type { Column } from '@tanstack/vue-table';

const props = defineProps<{
  column: Column<any>;
  label: string;
}>();

function handleClick() {
  const isSorted = props.column.getIsSorted();
  if (isSorted === 'asc') {
    props.column.toggleSorting(true); // go to desc
  } else if (isSorted === 'desc') {
    props.column.clearSorting(); // go to unsorted
  } else {
    props.column.toggleSorting(false); // go to asc
  }
}
</script>
