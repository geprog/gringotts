<template>
  <div v-if="customer" class="w-full flex flex-col gap-4 max-w-4xl mx-auto">
    <h1 class="text-xl">Customer: {{ customer.name }}</h1>

    <UCard>
      <UForm :state="customer" class="flex flex-col gap-4">
        <UFormField label="Name" name="name" required>
          <UInput color="primary" variant="outline" v-model="customer.name" size="lg" required :disabled="disabled" />
        </UFormField>

        <UFormField label="Email" name="email" required>
          <UInput color="primary" variant="outline" v-model="customer.email" size="lg" required :disabled="disabled" />
        </UFormField>

        <UFormField label="Address line 1" name="addressLine1">
          <UInput color="primary" variant="outline" v-model="customer.addressLine1" size="lg" :disabled="disabled" />
        </UFormField>

        <UFormField label="Address line 2" name="addressLine2">
          <UInput color="primary" variant="outline" v-model="customer.addressLine2" size="lg" :disabled="disabled" />
        </UFormField>

        <UFormField label="City" name="city">
          <UInput color="primary" variant="outline" v-model="customer.city" size="lg" :disabled="disabled" />
        </UFormField>

        <UFormField label="Zip code" name="zipCode">
          <UInput color="primary" variant="outline" v-model="customer.zipCode" size="lg" :disabled="disabled" />
        </UFormField>

        <UFormField label="Country" name="country">
          <UInput color="primary" variant="outline" v-model="customer.country" size="lg" :disabled="disabled" />
        </UFormField>

        <UFormField label="Language" name="language">
          <USelectMenu
            color="primary"
            variant="outline"
            v-model="customer.language"
            :items="['en', 'de']"
            size="lg"
            :disabled="disabled"
          />
        </UFormField>

        <UFormField label="Balance" name="balance" required>
          <UInput
            color="primary"
            variant="outline"
            type="number"
            v-model="customer.balance"
            size="lg"
            required
            :disabled="disabled"
          >
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">{{ currency }}</span>
            </template>
          </UInput>
        </UFormField>

        <!-- <UButton label="Save" type="submit" class="mx-auto" /> -->
      </UForm>
    </UCard>

    <UCard>
      <h2>Payment methods</h2>

      <div class="flex">
        <UButton label="Add payment method" icon="i-ion-plus" class="ml-auto" size="sm" @click="addNewPaymentMethod" />
      </div>

      <UTable :loading="paymentMethodPending" :data="paymentMethods || []" :columns="paymentMethodColumns">
        <template #active-cell="{ row }">
          <UIcon
            v-if="row.original._id === customer.activePaymentMethod?._id"
            name="i-mdi-check-decagram"
            class="text-green-500"
          />
          <div v-else />
        </template>

        <template #actions-cell="{ row }">
          <UDropdownMenu :items="paymentMethodActions(row.original)">
            <UButton color="neutral" variant="ghost" icon="i-ion-ellipsis-horizontal" />
          </UDropdownMenu>
        </template>
      </UTable>
    </UCard>

    <UCard>
      <h2>Subscriptions</h2>

      <UTable
        :loading="subscriptionPending"
        :data="subscriptions || []"
        :columns="subscriptionColumns"
        @select="selectSubscription"
      >
        <template #status-cell="{ row }">
          <StatusSubscription :subscription="row.original" />
        </template>

        <template #lastPayment-cell="{ row }">
          <span v-if="row.original.lastPayment">{{ formatDate(row.original.lastPayment) }}</span>
        </template>

        <template #currentPeriodEnd-cell="{ row }">
          <span
            >{{ formatDate(row.original.currentPeriodStart) }} - {{ formatDate(row.original.currentPeriodEnd) }}</span
          >
        </template>
      </UTable>
    </UCard>

    <UCard>
      <h2>Invoices</h2>

      <UTable
        :loading="invoicesPending"
        :data="invoices || []"
        :columns="invoicesColumns"
        :sort="{ column: 'date', direction: 'desc' }"
        @select="selectInvoice"
      >
        <template #date-cell="{ row }">
          <span>{{ formatDate(row.original.date) }}</span>
        </template>

        <template #totalAmount-cell="{ row }">
          <span v-if="row.original.totalAmount && row.original.currency">{{
            formatCurrency(row.original.totalAmount, row.original.currency)
          }}</span>
        </template>

        <template #status-cell="{ row }">
          <StatusInvoice :invoice="row.original" />
        </template>
      </UTable>
    </UCard>
  </div>
</template>

<script lang="ts" setup>
import { ContentType } from '@geprog/gringotts-client';
import type { Invoice, PaymentMethod, Subscription } from '@geprog/gringotts-client';
import type { TableColumn, TableRow } from '@nuxt/ui';
import SortableHeader from '~/components/SortableHeader.vue';

const client = useGringottsClient();
const route = useRoute();
const router = useRouter();
const customerId = route.params.customerId as string;

const disabled = true;

const { data: customer, refresh: updateCustomer } = useAsyncData(async () => {
  const { data } = await client.customer.getCustomer(customerId);
  return data;
});

const paymentMethodColumns: TableColumn<PaymentMethod>[] = [
  {
    accessorKey: '_id',
    header: 'ID',
  },
  {
    accessorKey: 'name',
    header: ({ column }) =>
      h(SortableHeader, {
        column,
        label: 'Name',
      }),
  },
  {
    accessorKey: 'type',
    header: ({ column }) =>
      h(SortableHeader, {
        column,
        label: 'Type',
      }),
  },
  {
    accessorKey: 'active',
    header: ({ column }) =>
      h(SortableHeader, {
        column: column,
        label: 'Active',
      }),
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
  },
];
const {
  data: paymentMethods,
  pending: paymentMethodPending,
  refresh: updatePaymentMethods,
} = useAsyncData(async () => {
  const { data } = await client.customer.listPaymentMethods(customerId);
  return data;
});

async function setActivePaymentMethod(paymentMethod: PaymentMethod) {
  const _customer = customer.value;
  if (!_customer) return;

  await client.customer.patchCustomer(customerId, { activePaymentMethod: paymentMethod }, { type: ContentType.Json });

  await updatePaymentMethods();
  await updateCustomer();
}

async function deletePaymentMethod(paymentMethod: PaymentMethod) {
  const _customer = customer.value;
  if (!_customer) return;

  await client.customer.deletePaymentMethod(customerId, paymentMethod._id!);

  await updatePaymentMethods();
  await updateCustomer();
}

const paymentMethodActions = (row: PaymentMethod) => [
  [
    {
      label: 'Set active',
      icon: 'i-mdi-check-decagram',
      click: () => setActivePaymentMethod(row),
    },
    {
      label: 'Delete',
      icon: 'i-ion-trash',
      click: () => deletePaymentMethod(row),
    },
  ],
];

const subscriptionColumns: TableColumn<Subscription>[] = [
  {
    accessorKey: '_id',
    header: 'ID',
  },
  {
    accessorKey: 'status',
    header: ({ column }) => h(SortableHeader, { column, label: 'Status' }),
  },
  {
    accessorKey: 'currentPeriodEnd',
    header: ({ column }) => h(SortableHeader, { column, label: 'Current period' }),
  },
];
const { data: subscriptions, pending: subscriptionPending } = useAsyncData(async () => {
  const { data } = await client.customer.listCustomerSubscriptions(customerId);
  return data;
});

async function selectSubscription(row: TableRow<Subscription>, _e?: Event) {
  await router.push(`/subscriptions/${row.original._id}`);
}

const invoicesColumns: TableColumn<Invoice>[] = [
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
    header: ({ column }) => h(SortableHeader, { column, label: 'Total' }),
  },
];
const { data: invoices, pending: invoicesPending } = useAsyncData(async () => {
  const { data } = await client.customer.listCustomerInvoices(customerId);
  return data;
});

async function selectInvoice(row: TableRow<Invoice>, _e?: Event) {
  await router.push(`/invoices/${row.original._id}`);
}

const currency = 'EUR'; // TODO: use variable currency for balance

async function addNewPaymentMethod() {
  const { data } = await client.customer.createPaymentMethod(customerId, {
    redirectUrl: window.location.href,
  });

  if (data.checkoutUrl) {
    window.location.href = data.checkoutUrl;
  }
}
</script>
