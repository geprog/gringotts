<template>
  <div class="mx-auto w-full max-w-xl flex flex-col gap-4 mb-8">
    <div class="p-4 rounded-md">
      <h2>Customers</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">name</th>
            <th scope="col">email</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="customer in customers" :key="customer._id">
            <td>
              <nuxt-link :to="`/customers/${customer._id}`">{{ customer.name }}</nuxt-link>
            </td>
            <td>
              {{ customer.email }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useGringottsClient } from '~/compositions/useClient';

const client = useGringottsClient();
const customers = ref((await client.customer.customerList()).data);
</script>
