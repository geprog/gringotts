<template>
  <div v-if="subscription" class="w-full flex flex-col gap-4 max-w-4xl mx-auto">
    <h1 class="text-xl">Subscription: {{ subscription._id }}</h1>

    <UCard>
      <UForm :state="subscription" class="flex flex-col gap-4">
        <UFormGroup v-if="subscription.customer" label="Customer" name="customer">
          <UInput color="primary" variant="outline" v-model="subscription.customer.name" size="lg" disabled />
        </UFormGroup>

        <UFormGroup label="Anchor date" name="anchorDate">
          <DatePicker v-model="subscription.anchorDate" disabled />
        </UFormGroup>

        <UFormGroup label="Active until" name="activeUntil">
          <DatePicker v-model="subscription.activeUntil" disabled />
        </UFormGroup>

        <UFormGroup label="Last payment" name="lastPayment">
          <DatePicker v-model="subscription.lastPayment" disabled />
        </UFormGroup>

        <UFormGroup label="Next payment" name="nextPayment">
          <DatePicker v-model="subscription.nextPayment" disabled />
        </UFormGroup>

        <UFormGroup label="Status" name="status">
          <USelectMenu
            color="primary"
            variant="outline"
            v-model="subscription.status"
            :options="['active', 'error']"
            size="lg"
            disabled
          />
        </UFormGroup>

        <UFormGroup v-if="subscription.error" label="Error" name="error">
          <UTextarea color="primary" variant="outline" v-model="subscription.error" size="lg" disabled />
        </UFormGroup>

        <!-- <UButton label="Save" type="submit" class="mx-auto" /> -->
      </UForm>
    </UCard>

    <UCard>
      <h2>Invoices</h2>

      <UTable :loading="invoicesPending" :rows="invoices || []" :columns="invoiceColumns" @select="selectInvoice">
        <template #date-data="{ row }">
          <span v-if="row.date">{{ formatDate(row.date) }}</span>
        </template>

        <template #status-data="{ row }">
          <UBadge v-if="row.status === 'draft'" size="xs" label="Draft" color="primary" variant="subtle" />
          <UBadge v-else-if="row.status === 'pending'" size="xs" label="Pending" color="amber" variant="subtle" />
          <UBadge v-else-if="row.status === 'paid'" size="xs" label="Paid" color="emerald" variant="subtle" />
          <UBadge v-else-if="row.status === 'failed'" size="xs" label="Failed" color="rose" variant="subtle" />
        </template>

        <template #totalAmount-data="{ row }">
          <span>{{ formatCurrency(row.totalAmount, row.currency) }}</span>
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
import { Invoice } from '@geprog/gringotts-client';

const client = await useGringottsClient();
const route = useRoute();
const router = useRouter();
const subscriptionId = route.params.subscriptionId as string;

const { data: subscription } = useAsyncData(async () => {
  const { data } = await client.subscription.getSubscription(subscriptionId);
  return data;
});

const subscriptionChangeColumns = [
  {
    key: 'start',
    label: 'Start',
    sortable: true,
  },
  {
    key: 'end',
    label: 'End',
    sortable: true,
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

async function selectInvoice(row: Invoice) {
  await router.push(`/invoices/${row._id}`);
}

const invoiceColumns = [
  {
    key: 'number',
    label: 'Number',
    sortable: true,
  },
  {
    key: 'date',
    label: 'Date',
    sortable: true,
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
  },
  {
    key: 'totalAmount',
    label: 'Total',
  },
];
const { data: invoices, pending: invoicesPending } = useAsyncData(async () => {
  const { data } = await client.subscription.listSubscriptionInvoices(subscriptionId);
  return data;
});
</script>
