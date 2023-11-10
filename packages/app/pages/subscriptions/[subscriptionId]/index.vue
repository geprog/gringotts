<template>
  <div v-if="subscription" class="w-full flex flex-col gap-4 max-w-4xl mx-auto">
    <div class="flex justify-between">
      <h1 class="text-xl">Subscription: {{ subscription._id }}</h1>

      <StatusSubscription :subscription="subscription" />
    </div>

    <UCard>
      <div class="flex justify-end mb-2 gap-2 items-center">
        <UDropdown v-if="subscriptionActions[0].length > 0" :items="subscriptionActions">
          <UButton label="Actions" trailing-icon="i-heroicons-chevron-down-20-solid" size="sm" />
        </UDropdown>
      </div>

      <UForm :state="subscription" class="flex flex-col gap-4">
        <UFormGroup v-if="subscription.customer" label="Customer" name="customer">
          <div class="flex w-full gap-2">
            <UInput
              color="primary"
              variant="outline"
              v-model="subscription.customer.name"
              size="lg"
              disabled
              class="flex-grow"
            />

            <router-link v-if="subscription.customer" :to="`/customers/${subscription.customer._id}`">
              <UButton :label="subscription.customer.name" icon="i-ion-people" size="lg" />
            </router-link>
          </div>
        </UFormGroup>

        <UFormGroup label="Anchor date" name="anchorDate">
          <DatePicker v-model="subscription.anchorDate" disabled />
        </UFormGroup>

        <UFormGroup label="Last payment" name="lastPayment">
          <DatePicker v-model="subscription.lastPayment" disabled />
        </UFormGroup>

        <UFormGroup label="Current period start" name="currentPeriodStart">
          <DatePicker v-model="subscription.currentPeriodStart" disabled />
        </UFormGroup>

        <UFormGroup label="Current period end" name="currentPeriodEnd">
          <DatePicker v-model="subscription.currentPeriodEnd" disabled />
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

        <UFormGroup label="Error" name="error">
          <UTextarea color="primary" variant="outline" v-model="subscription.error" size="lg" disabled />
        </UFormGroup>

        <UFormGroup label="Metadata" name="metadata">
          <UTextarea color="primary" variant="outline" v-model="metadata" size="lg" disabled />
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
          <StatusInvoice :invoice="row" />
        </template>

        <template #totalAmount-data="{ row }">
          <span>{{ formatCurrency(row.totalAmount, row.currency) }}</span>
        </template>
      </UTable>
    </UCard>

    <UCard>
      <h2>Changes</h2>

      <UTable
        :rows="subscription.changes || []"
        :columns="subscriptionChangeColumns"
        :sort="{ column: 'start', direction: 'desc' }"
      >
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
import type { Invoice } from '@geprog/gringotts-client';
import type { DropdownItem } from '@nuxt/ui/dist/runtime/types';

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
  const actions: DropdownItem[] = [];

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
