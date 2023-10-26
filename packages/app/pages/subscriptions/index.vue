<template>
  <div class="w-full">
    <h1 class="text-xl">Subscriptions</h1>

    <UTable :loading="pending" :rows="subscriptions || []" :columns="subscriptionColumns" @select="selectSubscription">
      <template #customer-data="{ row }">
        <span>{{ row.customer.name }}</span>
      </template>

      <template #status-data="{ row }">
        <UBadge v-if="row.status === 'active'" size="xs" label="Active" color="emerald" variant="subtle" />
        <UBadge v-else-if="row.status === 'error'" size="xs" label="Error" color="rose" variant="subtle" />
      </template>

      <template #currentPeriodEnd-data="{ row }">
        <span>{{ formatDate(row.currentPeriodStart) }} - {{ formatDate(row.currentPeriodEnd) }}</span>
      </template>
    </UTable>
  </div>
</template>

<script lang="ts" setup>
import type { Subscription } from '@geprog/gringotts-client';

const router = useRouter();
const client = await useGringottsClient();

const subscriptionColumns = [
  {
    key: '_id',
    label: 'ID',
  },
  {
    key: 'customer',
    label: 'Customer',
    sortable: true,
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
  },
  {
    key: 'currentPeriodEnd',
    label: 'Current period',
    sortable: true,
  },
];

async function selectSubscription(row: Subscription) {
  await router.push(`/subscriptions/${row._id}`);
}

const { data: subscriptions, pending } = useAsyncData(async () => {
  const { data } = await client.subscription.listSubscriptions();
  return data;
});
</script>
