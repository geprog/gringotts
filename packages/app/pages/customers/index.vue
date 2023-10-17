<template>
  <div>
    <h1 class="text-xl">Customers</h1>

    <UTable :loading="pending" :rows="customers || []" :columns="customerColumns" @select="selectCustomer" />
  </div>
</template>

<script lang="ts" setup>
import { Customer } from '@geprog/gringotts-client';

const router = useRouter();
const client = await useGringottsClient();

const customerColumns = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
  },
  {
    key: 'email',
    label: 'Email',
    sortable: true,
  },
];

async function selectCustomer(row: Customer) {
  await router.push(`/customers/${row._id}`);
}

const { data: customers, pending } = useAsyncData(async () => {
  const { data } = await client.customer.customerList();
  return data;
});
</script>
