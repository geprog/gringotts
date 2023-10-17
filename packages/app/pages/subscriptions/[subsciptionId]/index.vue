<template>
  <div v-if="subscription" class="w-full flex flex-col gap-4 max-w-xl mx-auto">
    <h1 class="text-xl">Subscription {{ subscription._id }}</h1>

    <UCard>
      <UForm :state="subscription" class="flex flex-col gap-4">
        <UFormGroup label="Name" name="name">
          <UInput color="primary" variant="outline" v-model="subscription.activeUntil" size="lg" required />
        </UFormGroup>

        <UFormGroup label="Email" name="email">
          <UInput color="primary" variant="outline" v-model="subscription.anchorDate" size="lg" required />
        </UFormGroup>

        <UFormGroup label="Address line 1" name="addressLine1">
          <UInput color="primary" variant="outline" v-model="subscription.lastPayment" size="lg" />
        </UFormGroup>

        <!-- <UButton label="Save" type="submit" class="mx-auto" /> -->
      </UForm>
    </UCard>

    <UCard>
      <h2>Changes</h2>

      <UTable :rows="subscription.changes || []" :columns="subscriptionChangeColumns"></UTable>
    </UCard>

    <UCard>
      <h2>Invoices</h2>

      <UTable :loading="invoicesPending" :rows="invoices || []" :columns="invoiceColumns">
        <template #action-data="{ row }">
          <UIcon v-if="!preparingInvoice" name="i-mdi-check-decagram" @click="downloadInvoice(row._id)" />
        </template>
      </UTable>
    </UCard>
  </div>
</template>

<script lang="ts" setup>
const client = await useGringottsClient();
const route = useRoute();
const subscriptionId = route.params.subscriptionId as string;

const { data: subscription } = useAsyncData(async () => {
  const { data } = await client.subscription.subscriptionDetail(subscriptionId);
  return data;
});

const subscriptionChangeColumns = [
  {
    key: 'start',
    label: 'Start',
  },
  {
    key: 'end',
    label: 'End',
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
async function downloadInvoice(_id: string) {
  preparingInvoice.value = true;
  const { data } = await client.invoice.generateDownloadLinkDetail(_id);
  preparingInvoice.value = false;
  window.open(data.url, '_blank');
}

const invoiceColumns = [
  {
    key: 'sequentialId',
    label: 'ID',
  },
  {
    key: 'status',
    label: 'Status',
  },
  {
    key: 'date',
    label: 'Date',
  },
  {
    key: 'totalAmount',
    label: 'Total',
  },
  {
    key: 'action',
  },
];
const { data: invoices, pending: invoicesPending } = useAsyncData(async () => {
  const { data } = await client.subscription.invoiceDetail(subscriptionId);
  return data;
});
</script>
