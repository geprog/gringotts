<template>
  <UBadge v-if="subscription.status === 'processing'" size="xs" label="Processing" color="warning" variant="subtle" />
  <UBadge v-else-if="subscription.status === 'active'" size="xs" label="Active" color="success" variant="subtle" />
  <UBadge v-else-if="subscription.status === 'error'" size="xs" label="Error" color="error" variant="subtle" />
  <UBadge v-else-if="subscription.status === 'paused'" size="xs" label="Paused" color="neutral" variant="solid" />
  <UBadge v-else-if="subscription.status === 'canceled'" size="xs" label="Canceled" color="neutral" variant="solid" />
</template>

<script lang="ts" setup>
import type { Subscription } from '@geprog/gringotts-client';

defineProps<{
  subscription: Subscription;
}>();
</script>
