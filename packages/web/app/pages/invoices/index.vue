<template>
  <div class="w-full">
    <h1 class="text-xl">Invoices</h1>

    <UTable
      :loading="pending"
      :data="invoices || []"
      :columns="invoiceColumns"
      :sort="{ column: 'date', direction: 'desc' }"
      @select="selectInvoice"
    >
      <template #customer-cell="{ row }">
        <span>{{ row.original.customer?.name }}</span>
      </template>

      <template #date-cell="{ row }">
        <span>{{ formatDate(row.original.date) }}</span>
      </template>

      <template #totalAmount-cell="{ row }">
        <span v-if="row.original.totalAmount && row.original.currency">
          {{ formatCurrency(row.original.totalAmount, row.original.currency) }}
        </span>
      </template>

      <template #status-cell="{ row }">
        <StatusInvoice :invoice="row.original" />
      </template>
    </UTable>
  </div>
</template>

<script lang="ts" setup>
import type { Invoice } from '@geprog/gringotts-client';
import type { TableColumn, TableRow } from '@nuxt/ui';
import SortableHeader from '~/components/SortableHeader.vue';

const router = useRouter();
const client = await useGringottsClient();

const invoiceColumns: TableColumn<Invoice>[] = [
  {
    accessorKey: 'number',
    header: ({ column }) => h(SortableHeader, { column, label: 'Number' }),
  },
  {
    accessorKey: 'customer',
    header: ({ column }) => h(SortableHeader, { column, label: 'Customer' }),
  },
  {
    accessorKey: 'date',
    header: ({ column }) => h(SortableHeader, { column, label: 'Date' }),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => h(SortableHeader, { column, label: 'Status' }),
  },
  {
    accessorKey: 'totalAmount',
    header: ({ column }) => h(SortableHeader, { column, label: 'Total' }),
  },
];

async function selectInvoice(row: TableRow<Invoice>, _e?: Event) {
  await router.push(`/invoices/${row.original._id}`);
}

const { data: invoices, pending } = useAsyncData(async () => {
  const { data } = await client.invoice.listInvoices();
  return data;
});
</script>
