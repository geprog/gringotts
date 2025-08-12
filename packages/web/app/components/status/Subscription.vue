<template>
  <UBadge v-if="subscription.status === 'processing'" size="xs" label="Processing" color="amber" variant="subtle" />
  <UBadge v-else-if="subscription.status === 'active'" size="xs" label="Active" color="emerald" variant="subtle" />
  <UBadge v-else-if="subscription.status === 'error'" size="xs" label="Error" color="rose" variant="subtle" />
  <UBadge v-else-if="subscription.status === 'paused'" size="xs" label="Paused" color="gray" variant="solid" />
  <UBadge v-else-if="subscription.status === 'canceled'" size="xs" label="Canceled" color="gray" variant="solid" />
</template>

<script lang="ts" setup>
import type { Subscription } from '@geprog/gringotts-client';

defineProps<{
  subscription: Subscription;
}>();
</script>
