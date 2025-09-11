<template>
  <div class="w-full">
    <h1 class="text-xl">Payments</h1>

    <UTable :loading="pending" :data="payments || []" :columns="paymentColumns" @select="selectPayment">
      <template #customer-cell="{ row }">
        <span>{{ row.original.customer?.name }}</span>
      </template>

      <template #amount-cell="{ row }">
        <span v-if="row.original.amount && row.original.currency">
          {{ formatCurrency(row.original.amount, row.original.currency) }}
        </span>
      </template>

      <template #status-cell="{ row }">
        <StatusPayment :payment="row.original" />
      </template>
    </UTable>
  </div>
</template>

<script lang="ts" setup>
import type { Payment } from '@geprog/gringotts-client';
import type { TableColumn, TableRow } from '@nuxt/ui';
import SortableHeader from '~/components/SortableHeader.vue';

const router = useRouter();
const client = useGringottsClient();

const paymentColumns: TableColumn<Payment>[] = [
  {
    accessorKey: '_id',
    header: 'ID',
  },
  {
    accessorKey: 'description',
    header: ({ column }) => h(SortableHeader, { column, label: 'Description' }),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => h(SortableHeader, { column, label: 'Status' }),
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => h(SortableHeader, { column, label: 'Current period' }),
  },
];

async function selectPayment(row: TableRow<Payment>, _e?: Event) {
  await router.push(`/payments/${row.original._id}`);
}

const { data: payments, pending } = useAsyncData(async () => {
  const { data } = await client.payment.listPayments();
  return data;
});
</script>
