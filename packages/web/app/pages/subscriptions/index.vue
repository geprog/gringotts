<template>
  <div class="w-full">
    <h1 class="text-xl">Subscriptions</h1>

    <UTable :loading="pending" :data="subscriptions || []" :columns="subscriptionColumns" @select="selectSubscription">
      <template #customer-cell="{ row }">
        <span>{{ row.original.customer?.name }}</span>
      </template>

      <template #status-cell="{ row }">
        <StatusSubscription :subscription="row.original" />
      </template>

      <template #currentPeriodEnd-cell="{ row }">
        <span>{{ formatDate(row.original.currentPeriodStart) }} - {{ formatDate(row.original.currentPeriodEnd) }}</span>
      </template>
    </UTable>
  </div>
</template>

<script lang="ts" setup>
import type { Subscription } from '@geprog/gringotts-client';
import type { TableColumn, TableRow } from '@nuxt/ui';
import SortableHeader from '~/components/SortableHeader.vue';

const client = useGringottsClient();
const router = useRouter();

const subscriptionColumns: TableColumn<Subscription>[] = [
  {
    accessorKey: '_id',
    header: 'ID',
  },
  {
    accessorKey: 'customer',
    header: ({ column }) => h(SortableHeader, { column, label: 'Customer' }),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => h(SortableHeader, { column, label: 'Status' }),
  },
  {
    accessorKey: 'currentPeriodEnd',
    header: ({ column }) => h(SortableHeader, { column, label: 'Current period' }),
  },
];

async function selectSubscription(row: TableRow<Subscription>, _e?: Event) {
  await router.push(`/subscriptions/${row.original._id}`);
}

const { data: subscriptions, pending } = useAsyncData(async () => {
  const { data } = await client.subscription.listSubscriptions();
  return data;
});
</script>
