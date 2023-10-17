<template>
  <div v-if="subscription" class="w-full flex flex-col gap-4 max-w-4xl mx-auto">
    <h1 class="text-xl">Subscription: {{ subscription._id }}</h1>

    <UCard>
      <UForm :state="subscription" class="flex flex-col gap-4">
        <UFormGroup v-if="subscription.customer" label="Customer" name="customer">
          <UInput color="primary" variant="outline" v-model="subscription.customer.name" size="lg" read-only />
        </UFormGroup>

        <UFormGroup label="Anchor date" name="anchorDate">
          <UInput color="primary" variant="outline" v-model="subscription.anchorDate" size="lg" read-only />
        </UFormGroup>

        <UFormGroup label="Active until" name="activeUntil">
          <UInput color="primary" variant="outline" v-model="subscription.activeUntil" size="lg" read-only />
        </UFormGroup>

        <UFormGroup label="Last payment" name="lastPayment">
          <UInput color="primary" variant="outline" v-model="subscription.lastPayment" size="lg" read-only />
        </UFormGroup>

        <UFormGroup label="Status" name="status">
          <UInput color="primary" variant="outline" v-model="subscription.status" size="lg" read-only />
        </UFormGroup>

        <!-- <UButton label="Save" type="submit" class="mx-auto" /> -->
      </UForm>
    </UCard>

    <UCard>
      <h2>Invoices</h2>

      <UTable :loading="invoicesPending" :rows="invoices || []" :columns="invoiceColumns">
        <template #date-data="{ row }">
          <span v-if="row.date">{{ formatDate(row.date) }}</span>
        </template>

        <template #action-data="{ row }">
          <UButton v-if="!preparingInvoice" @click="downloadInvoice(row._id)">
            <UIcon name="i-mdi-download" />
          </UButton>
        </template>
      </UTable>
    </UCard>

    <UCard>
      <h2>Changes</h2>

      <UTable :rows="subscription.changes || []" :columns="subscriptionChangeColumns">
        <template #start-data="{ row }">
          <span v-if="row.start">{{ formatDateTime(row.start) }}</span>
        </template>

        <template #end-data="{ row }">
          <span v-if="row.end">{{ formatDateTime(row.end) }}</span>
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
