<template>
  <div class="w-full">
    <h1 class="text-xl">Invoices</h1>

    <UTable
      :loading="pending"
      :rows="invoices || []"
      :columns="invoiceColumns"
      :sort="{ column: 'date', direction: 'desc' }"
      @select="selectInvoice"
    >
      <template #customer-data="{ row }">
        <span>{{ row.customer.name }}</span>
      </template>

      <template #date-data="{ row }">
        <span>{{ formatDate(row.date) }}</span>
      </template>

      <template #totalAmount-data="{ row }">
        <span>{{ formatCurrency(row.totalAmount, row.currency) }}</span>
      </template>

      <template #status-data="{ row }">
        <StatusInvoice :invoice="row" />
      </template>
    </UTable>
  </div>
</template>

<script lang="ts" setup>
import type { Invoice } from '@geprog/gringotts-client';

const router = useRouter();
const client = await useGringottsClient();

const invoiceColumns = [
  {
    key: 'number',
    label: 'Number',
    sortable: true,
  },
  {
    key: 'customer',
    label: 'Customer',
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
