<template>
  <div v-if="subscription" class="w-full flex flex-col gap-4 max-w-4xl mx-auto">
    <div class="flex justify-between">
      <h1 class="text-xl">Subscription: {{ subscription._id }}</h1>

      <StatusSubscription :subscription="subscription" />
    </div>

    <UCard>
      <div class="flex justify-end mb-2 gap-2 items-center">
        <UDropdownMenu v-if="subscriptionActions[0] && subscriptionActions[0].length > 0" :items="subscriptionActions">
          <UButton label="Actions" trailing-icon="i-heroicons-chevron-down-20-solid" size="sm" />
        </UDropdownMenu>
      </div>

      <UForm :state="subscription" class="flex flex-col gap-4">
        <UFormField v-if="subscription.customer" label="Customer" name="customer">
          <div class="flex w-full gap-2">
            <UInput
              color="primary"
              variant="outline"
              v-model="subscription.customer.name"
              size="lg"
              disabled
              class="grow"
            />

            <router-link v-if="subscription.customer" :to="`/customers/${subscription.customer._id}`">
              <UButton :label="subscription.customer.name" icon="i-ion-people" size="lg" />
            </router-link>
          </div>
        </UFormField>

        <UFormField label="Anchor / start date" name="anchorDate">
          <DatePicker v-model="subscription.anchorDate" disabled />
        </UFormField>

        <UFormField label="Last payment" name="lastPayment">
          <DatePicker v-model="subscription.lastPayment" disabled />
        </UFormField>

        <UFormField label="Current period start" name="currentPeriodStart">
          <DatePicker v-model="subscription.currentPeriodStart" disabled />
        </UFormField>

        <UFormField label="Current period end" name="currentPeriodEnd">
          <DatePicker v-model="subscription.currentPeriodEnd" disabled />
        </UFormField>

        <UFormField label="Status" name="status">
          <USelectMenu
            color="primary"
            variant="outline"
            v-model="subscription.status"
            :items="['active', 'error']"
            size="lg"
            disabled
          />
        </UFormField>

        <UFormField label="Error" name="error">
          <UTextarea color="primary" variant="outline" v-model="subscription.error" size="lg" disabled />
        </UFormField>

        <UFormField label="Metadata" name="metadata">
          <UTextarea color="primary" variant="outline" v-model="metadata" size="lg" disabled />
        </UFormField>

        <!-- <UButton label="Save" type="submit" class="mx-auto" /> -->
      </UForm>
    </UCard>

    <UCard>
      <h2>Invoices</h2>

      <UTable :loading="invoicesPending" :data="invoices || []" :columns="invoiceColumns" @select="selectInvoice">
        <template #date-cell="{ row }">
          <span v-if="row.original.date">{{ formatDate(row.original.date) }}</span>
        </template>

        <template #status-cell="{ row }">
          <StatusInvoice :invoice="row.original" />
        </template>

        <template #totalAmount-cell="{ row }">
          <span v-if="row.original.totalAmount && row.original.currency">{{
            formatCurrency(row.original.totalAmount, row.original.currency)
          }}</span>
        </template>
      </UTable>
    </UCard>

    <UCard>
      <h2>Changes</h2>

      <UTable
        :data="subscription.changes || []"
        :columns="subscriptionChangeColumns"
        :sort="{ column: 'start', direction: 'desc' }"
      >
        <template #start-cell="{ row }">
          <span v-if="row.original.start">{{ formatDateTime(row.original.start) }}</span>
        </template>

        <template #end-cell="{ row }">
          <span v-if="row.original.end">{{ formatDateTime(row.original.end) }}</span>
        </template>
      </UTable>
    </UCard>
  </div>
</template>

<script lang="ts" setup>
import type { Invoice, SubscriptionChange } from '@geprog/gringotts-client';
import type { DropdownMenuItem, TableColumn, TableRow } from '@nuxt/ui';
import SortableHeader from '~/components/SortableHeader.vue';

const client = await useGringottsClient();
const route = useRoute();
const router = useRouter();
const subscriptionId = route.params.subscriptionId as string;

const { data: subscription, refresh } = useAsyncData(async () => {
  const { data } = await client.subscription.getSubscription(subscriptionId);
  return data;
});

const metadata = computed({
  get() {
    return subscription.value?.metadata ? JSON.stringify(subscription.value.metadata, null, 2) : '';
  },
  set(metadata: string) {
    // TODO
  },
});

const subscriptionActions = computed(() => {
  const actions: DropdownMenuItem[] = [];

  if (subscription.value?.status === 'error') {
    actions.push({
      label: 'Reset error',
      icon: 'i-ion-md-undo',
      click: resetError,
    });
  }

  if (subscription.value?.status === 'active') {
    actions.push({
      label: 'Pause subscription',
      icon: 'i-ion-pause',
      click: () => changeSubscriptionStatus('paused'),
    });

    actions.push({
      label: 'Cancel subscription',
      icon: 'i-ion-close',
      click: () => changeSubscriptionStatus('canceled'),
    });
  }

  if (subscription.value?.status === 'paused') {
    actions.push({
      label: 'Unpause subscription',
      icon: 'i-ion-play',
      click: () => changeSubscriptionStatus('active'),
    });
  }

  return [actions];
});

const subscriptionChangeColumns: TableColumn<SubscriptionChange>[] = [
  {
    accessorKey: 'start',
    header: ({ column }) => h(SortableHeader, { column, label: 'Start' }),
  },
  {
    accessorKey: 'end',
    header: ({ column }) => h(SortableHeader, { column, label: 'End' }),
  },
  {
    accessorKey: 'pricePerUnit',
    header: 'Price per unit',
  },
  {
    accessorKey: 'units',
    header: 'Units',
  },
];

function selectInvoice(row: TableRow<Invoice>, _e?: Event) {
  void router.push(`/invoices/${row.original._id}`);
}

const invoiceColumns: TableColumn<Invoice>[] = [
  {
    accessorKey: 'number',
    header: ({ column }) => h(SortableHeader, { column, label: 'Number' }),
  },
  {
    accessorKey: 'date',
    header: ({ column }) => h(SortableHeader, { column, label: 'Date' }),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => h(SortableHeader, { column, label: 'Status' }),
  },
  {
    accessorKey: 'totalAmount',
    header: 'Total',
  },
];
const { data: invoices, pending: invoicesPending } = useAsyncData(async () => {
  const { data } = await client.subscription.listSubscriptionInvoices(subscriptionId);
  return data;
});

async function resetError() {
  await client.subscription.patchSubscription(subscriptionId, {
    status: 'active',
    error: '',
  });
  await refresh();
}

async function changeSubscriptionStatus(status: 'active' | 'paused' | 'canceled') {
  await client.subscription.patchSubscription(subscriptionId, {
    status,
  });
  await refresh();
}
</script>
