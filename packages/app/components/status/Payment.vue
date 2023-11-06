<template>
  <UBadge v-if="payment.status === 'processing'" size="xs" label="Processing" color="amber" variant="subtle" />
  <UBadge v-else-if="payment.status === 'paid'" size="xs" label="Paid" color="emerald" variant="subtle" />
  <UBadge v-else-if="payment.status === 'failed'" size="xs" label="Failed" color="rose" variant="subtle" />
</template>

<script lang="ts" setup>
import type { Payment } from '@geprog/gringotts-client';

defineProps<{
  payment: Payment;
}>();
</script>
