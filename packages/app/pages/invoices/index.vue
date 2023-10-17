<template>
  <div class="w-full">
    <h1 class="text-xl">Invoices</h1>

    <UTable :loading="pending" :rows="invoices || []" :columns="invoiceColumns" @select="selectInvoice">
      <template #date-data="{ row }">
        <span>{{ formatDate(row.date) }}</span>
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
