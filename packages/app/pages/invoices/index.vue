<template>
  <div class="w-full">
    <h1 class="text-xl">Invoices</h1>

    <UTable :loading="pending" :rows="invoices || []" :columns="invoiceColumns" @select="selectInvoice">
      <template #date-data="{ row }">
        <span>{{ formatDate(row.date) }}</span>
      </template>

      <template #totalAmount-data="{ row }">
        <span>{{ formatCurrency(row.totalAmount, row.currency) }}</span>
      </template>

      <template #status-data="{ row }">
        <div class="flex items-center gap-2">
          <div
            class="h-2 w-2 rounded-full"
            :class="{
              'bg-green-500': row.status === 'paid',
              'bg-yellow-500': row.status === 'pending',
              'bg-red-500': row.status === 'failed',
            }"
          />
          <span>{{ row.status }}</span>
        </div>
      </template>
    </UTable>
  </div>
</template>

<script lang="ts" setup>
import { Invoice } from '@geprog/gringotts-client';

const router = useRouter();
const client = await useGringottsClient();

const invoiceColumns = [
  {
    key: 'number',
    label: 'Number',
    sortable: true,
  },
  {
    key: 'date',
    label: 'Date',
    sortable: true,
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
  },
  {
    key: 'totalAmount',
    label: 'Total',
    sortable: true,
  },
];

async function selectInvoice(row: Invoice) {
  await router.push(`/invoices/${row._id}`);
}

const { data: invoices, pending } = useAsyncData(async () => {
  const { data } = await client.invoice.listInvoices();
  return data;
});
</script>
