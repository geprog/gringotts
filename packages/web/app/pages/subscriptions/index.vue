<template>
  <div class="w-full">
    <h1 class="text-xl">Subscriptions</h1>

    <UTable :loading="pending" :data="subscriptions || []" :columns="subscriptionColumns" @select="selectSubscription">
      <template #customer-data="{ row }">
        <span>{{ row.customer.name }}</span>
      </template>

      <template #status-data="{ row }">
        <StatusSubscription :subscription="row" />
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

const subscriptionColumns = [
  {
    key: '_id',
    header: 'ID',
  },
  {
    key: 'customer',
    header: 'Customer',
    sortable: true,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
  },
  {
    key: 'currentPeriodEnd',
    header: 'Current period',
    sortable: true,
  },
];

async function selectSubscription(row: Subscription) {
  await router.push(`/subscriptions/${row._id}`);
}

const { data: subscriptions, pending } = useAsyncData(async () => {
  const client = await useGringottsClient();
  const { data } = await client.subscription.listSubscriptions();
  return data;
});
</script>
