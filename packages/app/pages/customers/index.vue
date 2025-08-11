<template>
  <div class="w-full">
    <h1 class="text-xl">Customers</h1>

    <UTable :loading="pending" :rows="customers || []" :columns="customerColumns" @select="selectCustomer">
      <template #country-data="{ row }">
        <span>{{ row.country }}, {{ row.city }}</span>
      </template>
    </UTable>
  </div>
</template>

<script lang="ts" setup>
import type { Customer } from '@geprog/gringotts-client';

const router = useRouter();
const client = await useGringottsClient();

const customerColumns = [
  {
    key: '_id',
    header: 'ID',
  },
  {
    key: 'name',
    header: 'Name',
    sortable: true,
  },
  {
    key: 'email',
    header: 'Email',
    sortable: true,
  },
  {
    key: 'country',
    header: 'Address',
    sortable: true,
  },
];

async function selectCustomer(row: Customer) {
  await router.push(`/customers/${row._id}`);
}

const { data: customers, pending } = useAsyncData(async () => {
  const { data } = await client.customer.listCustomers();
  return data;
});
</script>
