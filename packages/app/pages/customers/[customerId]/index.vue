<template>
  <div v-if="customer" class="w-full flex flex-col gap-4 max-w-xl mx-auto">
    <h1 class="text-xl">Customer: {{ customer.name }}</h1>

    <UCard>
      <UForm :state="customer" class="flex flex-col gap-4">
        <UFormGroup label="Name" name="name">
          <UInput color="primary" variant="outline" v-model="customer.name" size="lg" required />
        </UFormGroup>

        <UFormGroup label="Email" name="email">
          <UInput color="primary" variant="outline" v-model="customer.email" size="lg" required />
        </UFormGroup>

        <UFormGroup label="Address line 1" name="addressLine1">
          <UInput color="primary" variant="outline" v-model="customer.addressLine1" size="lg" />
        </UFormGroup>

        <UFormGroup label="Address line 2" name="addressLine2">
          <UInput color="primary" variant="outline" v-model="customer.addressLine2" size="lg" />
        </UFormGroup>

        <UFormGroup label="City" name="city">
          <UInput color="primary" variant="outline" v-model="customer.city" size="lg" />
        </UFormGroup>

        <UFormGroup label="Zip code" name="zipCode">
          <UInput color="primary" variant="outline" v-model="customer.zipCode" size="lg" />
        </UFormGroup>

        <UFormGroup label="Country" name="country">
          <UInput color="primary" variant="outline" v-model="customer.country" size="lg" />
        </UFormGroup>

        <UFormGroup label="Balance" name="balance">
          <UInput color="primary" variant="outline" type="number" v-model="customer.balance" size="lg" required />
        </UFormGroup>

        <!-- <UButton label="Save" type="submit" class="mx-auto" /> -->
      </UForm>
    </UCard>

    <UCard>
      <h2>Payment methods</h2>

      <UTable :loading="paymentMethodPending" :rows="paymentMethods || []" :columns="paymentMethodColumns">
        <template #active-data="{ row }">
          <UIcon v-if="row._id === customer.activePaymentMethod?._id" name="i-mdi-check-decagram" />
        </template>
      </UTable>
    </UCard>

    <UCard>
      <h2>Subscriptions</h2>

      <UTable :loading="subscriptionPending" :rows="subscriptions || []" :columns="subscriptionColumns">
        <template #action-data="{ row }">
          <nuxt-link :to="`/customers/${customerId}/subscriptions/${row._id}`">{{ row.activeUntil }}</nuxt-link>
        </template>
      </UTable>
    </UCard>
  </div>
</template>

<script lang="ts" setup>
import { Subscription } from '@geprog/gringotts-client';

const client = await useGringottsClient();
const route = useRoute();
const customerId = route.params.customerId as string;

const { data: customer } = useAsyncData(async () => {
  const { data } = await client.customer.customerDetail(customerId);
  return data;
});

const paymentMethodColumns = [
  {
    key: 'name',
    label: 'Name',
  },
  {
    key: 'type',
    label: 'Type',
  },
  {
    key: 'active',
    label: 'Active',
  },
];
const { data: paymentMethods, pending: paymentMethodPending } = useAsyncData(async () => {
  const { data } = await client.customer.paymentMethodDetail(customerId);
  return data;
});

const subscriptionColumns = [
  {
    key: 'activeUntil',
    label: 'Active until',
  },
  {
    key: 'anchorDate',
    label: 'Anchor date',
  },
  {
    key: 'active',
    label: 'Active',
  },
];
const { data: subscriptions, pending: subscriptionPending } = useAsyncData(async () => {
  return [] as Subscription[];
});
</script>
