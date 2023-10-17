<template>
  <div v-if="invoice" class="w-full flex flex-col gap-4 max-w-4xl mx-auto">
    <h1 class="text-xl">Invoice: {{ invoice.number }}</h1>

    <UCard>
      <div class="flex justify-end mb-2 gap-2">
        <UButton :loading="preparingInvoice" label="Download" icon="i-ion-download" @click="downloadInvoice" />
        <template v-if="subscription && subscription.customer">
          <router-link :to="`/customers/${subscription.customer._id}`">
            <UButton :label="subscription.customer.name" icon="i-ion-people" />
          </router-link>
          <router-link :to="`/subscriptions/${subscription._id}`">
            <UButton label="Open Subscription" icon="i-ion-md-refresh" />
          </router-link>
        </template>
      </div>

      <UForm :state="invoice" class="flex flex-col gap-4">
        <UFormGroup label="Number" name="number">
          <UInput color="primary" variant="outline" v-model="invoice.number" size="lg" disabled />
        </UFormGroup>

        <UFormGroup label="Date" name="date">
          <UInput color="primary" variant="outline" v-model="invoice.date" size="lg" disabled />
        </UFormGroup>

        <UFormGroup label="Status" name="status">
          <UInput color="primary" variant="outline" v-model="invoice.status" size="lg" disabled />
        </UFormGroup>

        <UFormGroup label="Amount" name="amount">
          <UInput color="primary" variant="outline" v-model="invoice.amount" size="lg" disabled />
        </UFormGroup>

        <UFormGroup label="Vat rate" name="vatRate">
          <UInput color="primary" variant="outline" v-model="invoice.vatRate" size="lg" disabled />
        </UFormGroup>

        <UFormGroup label="Vat amount" name="vatAmount">
          <UInput color="primary" variant="outline" v-model="invoice.vatAmount" size="lg" disabled />
        </UFormGroup>

        <UFormGroup label="Currency" name="currency">
          <UInput color="primary" variant="outline" v-model="invoice.currency" size="lg" disabled />
        </UFormGroup>

        <UFormGroup label="Total amount" name="totalAmount">
          <UInput color="primary" variant="outline" v-model="invoice.totalAmount" size="lg" disabled />
        </UFormGroup>

        <template v-if="subscription && subscription.customer">
          <UFormGroup label="Customer">
            <UInput color="primary" variant="outline" v-model="subscription.customer.name" size="lg" disabled />
          </UFormGroup>
        </template>

        <!-- <UButton label="Save" type="submit" class="mx-auto" /> -->
      </UForm>
    </UCard>

    <UCard>
      <h2>Items</h2>

      <UTable :rows="invoice.items || []" :columns="invoiceItemColumns">
        <template #description-data="{ row }">
          <div class="whitespace-pre-wrap">{{ row.description }}</div>
        </template>
      </UTable>
    </UCard>
  </div>
</template>

<script lang="ts" setup>
const client = await useGringottsClient();
const route = useRoute();
const invoiceId = route.params.invoiceId as string;

const { data: invoice } = useAsyncData(async () => {
  const { data } = await client.invoice.invoiceDetail(invoiceId);
  return data;
});

const invoiceItemColumns = [
  {
    key: 'description',
    label: 'Description',
  },
  {
    key: 'pricePerUnit',
    label: 'Price per unit',
  },
  {
    key: 'units',
    label: 'Units',
  },
];

const preparingInvoice = ref(false);
async function downloadInvoice() {
  preparingInvoice.value = true;
  const { data } = await client.invoice.generateDownloadLinkDetail(invoiceId);
  preparingInvoice.value = false;
  window.open(data.url, '_blank');
}

const { data: subscription } = useAsyncData(async () => {
  const subscriptionId = invoice.value?.subscription?._id;
  if (!subscriptionId) return null;

  const { data } = await client.subscription.subscriptionDetail(subscriptionId);
  return data;
});
</script>
