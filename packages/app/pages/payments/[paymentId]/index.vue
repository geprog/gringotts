<template>
  <div v-if="payment" class="w-full flex flex-col gap-4 max-w-4xl mx-auto">
    <div class="flex justify-between">
      <h1 class="text-xl">Payment: {{ payment._id }}</h1>

      <StatusPayment :payment="payment" />
    </div>

    <UCard>
      <div class="flex justify-end mb-2 gap-2 items-center">
        <router-link v-if="payment.invoice" :to="`/invoices/${payment.invoice._id}`">
          <UButton label="Invoice" icon="i-ion-document-text" size="sm" />
        </router-link>
        <router-link v-if="payment.customer" :to="`/customers/${payment.customer._id}`">
          <UButton :label="payment.customer.name" icon="i-ion-people" size="sm" />
        </router-link>
        <router-link v-if="payment.subscription" :to="`/subscriptions/${payment.subscription._id}`">
          <UButton label="Subscription" icon="i-ion-md-refresh" size="sm" />
        </router-link>
      </div>

      <UForm :state="payment" class="flex flex-col gap-4">
        <UFormGroup label="Description" name="description">
          <UInput color="primary" variant="outline" v-model="payment.description" size="lg" disabled />
        </UFormGroup>

        <UFormGroup label="Type" name="type">
          <UInput color="primary" variant="outline" v-model="payment.type" size="lg" disabled />
        </UFormGroup>

        <UFormGroup label="Amount" name="amount">
          <UInput color="primary" variant="outline" v-model="payment._id" size="lg" disabled>
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">{{ payment.currency }}</span>
            </template>
          </UInput>
        </UFormGroup>

        <UFormGroup label="Status" name="status">
          <USelectMenu
            color="primary"
            variant="outline"
            v-model="payment.status"
            :options="['active', 'error']"
            size="lg"
            disabled
          />
        </UFormGroup>
      </UForm>
    </UCard>
  </div>
</template>

<script lang="ts" setup>
const client = await useGringottsClient();
const route = useRoute();
const paymentId = route.params.paymentId as string;

const { data: payment } = useAsyncData(async () => {
  const { data } = await client.payment.getPayment(paymentId);
  return data;
});
</script>
