<template>
  <UBadge v-if="payment.status === 'processing'" size="xs" label="Processing" color="warning" variant="subtle" />
  <UBadge v-else-if="payment.status === 'paid'" size="xs" label="Paid" color="success" variant="subtle" />
  <UBadge v-else-if="payment.status === 'failed'" size="xs" label="Failed" color="error" variant="subtle" />
</template>

<script lang="ts" setup>
import type { Payment } from '@geprog/gringotts-client';

defineProps<{
  payment: Payment;
}>();
</script>
