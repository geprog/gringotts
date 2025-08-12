<template>
  <UBadge v-if="invoice.status === 'draft'" size="xs" label="Draft" color="primary" variant="subtle" />
  <UBadge v-else-if="invoice.status === 'pending'" size="xs" label="Pending" color="amber" variant="subtle" />
  <UBadge v-else-if="invoice.status === 'processing'" size="xs" label="Processing" color="amber" variant="subtle" />
  <UBadge v-else-if="invoice.status === 'paid'" size="xs" label="Paid" color="emerald" variant="subtle" />
  <UBadge v-else-if="invoice.status === 'failed'" size="xs" label="Failed" color="rose" variant="subtle" />
</template>

<script lang="ts" setup>
import type { Invoice } from '@geprog/gringotts-client';

defineProps<{
  invoice: Invoice;
}>();
</script>
