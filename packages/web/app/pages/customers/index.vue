<template>
  <div class="w-full">
    <h1 class="text-xl">Customers</h1>

    <UTable :loading="pending" :data="customers || []" :columns="customerColumns" @select="selectCustomer">
      <template #country-cell="{ row }">
        <span>{{ row.original.country }}, {{ row.original.city }}</span>
      </template>
    </UTable>
  </div>
</template>

<script lang="ts" setup>
import type { Customer } from '@geprog/gringotts-client';
import type { TableColumn, TableRow } from '@nuxt/ui';
import SortableHeader from '~/components/SortableHeader.vue';

const router = useRouter();
const client = useGringottsClient();

const customerColumns: TableColumn<Customer>[] = [
  {
    accessorKey: '_id',
    header: 'ID',
  },
  {
    accessorKey: 'name',
    header: ({ column }) =>
      h(SortableHeader, {
        column,
        label: 'Name',
      }),
  },
  {
    accessorKey: 'email',
    header: ({ column }) =>
      h(SortableHeader, {
        column,
        label: 'Email',
      }),
  },
  {
    accessorKey: 'country',
    header: ({ column }) =>
      h(SortableHeader, {
        column,
        label: 'Address',
      }),
  },
];

async function selectCustomer(row: TableRow<Customer>, _e?: Event) {
  await router.push(`/customers/${row.original._id}`);
}

const { data: customers, pending } = useAsyncData(async () => {
  const { data } = await client.customer.listCustomers();
  return data;
});
</script>
