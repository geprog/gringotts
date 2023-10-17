<template>
  <div class="w-full">
    <h1 class="text-xl">Subscriptions</h1>

    <UTable :loading="pending" :rows="subscriptions || []" :columns="subscriptionColumns" @select="selectSubscription">
      <template #customer-data="{ row }">
        <span>{{ row.customer.name }}</span>
      </template>
    </UTable>
  </div>
</template>

<script lang="ts" setup>
import { Subscription } from '@geprog/gringotts-client';

const router = useRouter();
const client = await useGringottsClient();

const subscriptionColumns = [
  {
    key: '_id',
    label: 'ID',
  },
  {
    key: 'status',
    label: 'Status',
  },
  {
    key: 'customer',
    label: 'Customer',
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
