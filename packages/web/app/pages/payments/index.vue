<template>
  <div class="w-full">
    <h1 class="text-xl">Payments</h1>

    <UTable :loading="pending" :data="payments || []" :columns="paymentColumns" @select="selectPayment">
      <template #customer-data="{ row }">
        <span>{{ row.customer.name }}</span>
      </template>

      <template #amount-data="{ row }">
        <span>{{ formatCurrency(row.amount, row.currency) }}</span>
      </template>

      <template #status-data="{ row }">
        <StatusPayment :payment="row" />
      </template>
    </UTable>
  </div>
</template>

<script lang="ts" setup>
import type { Payment } from '@geprog/gringotts-client';

const router = useRouter();
const client = await useGringottsClient();

const paymentColumns = [
  {
    key: '_id',
    header: 'ID',
  },
  {
    key: 'description',
    header: 'Description',
    sortable: true,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
  },
  {
    key: 'amount',
    header: 'Current period',
    sortable: true,
  },
];

async function selectPayment(row: Payment) {
  await router.push(`/payments/${row._id}`);
}

const { data: payments, pending } = useAsyncData(async () => {
  const { data } = await client.payment.listPayments();
  return data;
});
</script>
