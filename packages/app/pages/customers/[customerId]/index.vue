<template>
  <div v-if="customer" class="w-full flex flex-col gap-4 max-w-4xl mx-auto">
    <h1 class="text-xl">Customer: {{ customer.name }}</h1>

    <UCard>
      <UForm :state="customer" class="flex flex-col gap-4">
        <UFormGroup label="Name" name="name" required>
          <UInput color="primary" variant="outline" v-model="customer.name" size="lg" required :disabled="disabled" />
        </UFormGroup>

        <UFormGroup label="Email" name="email" required>
          <UInput color="primary" variant="outline" v-model="customer.email" size="lg" required :disabled="disabled" />
        </UFormGroup>

        <UFormGroup label="Address line 1" name="addressLine1">
          <UInput color="primary" variant="outline" v-model="customer.addressLine1" size="lg" :disabled="disabled" />
        </UFormGroup>

        <UFormGroup label="Address line 2" name="addressLine2">
          <UInput color="primary" variant="outline" v-model="customer.addressLine2" size="lg" :disabled="disabled" />
        </UFormGroup>

        <UFormGroup label="City" name="city">
          <UInput color="primary" variant="outline" v-model="customer.city" size="lg" :disabled="disabled" />
        </UFormGroup>

        <UFormGroup label="Zip code" name="zipCode">
          <UInput color="primary" variant="outline" v-model="customer.zipCode" size="lg" :disabled="disabled" />
        </UFormGroup>

        <UFormGroup label="Country" name="country">
          <UInput color="primary" variant="outline" v-model="customer.country" size="lg" :disabled="disabled" />
        </UFormGroup>

        <UFormGroup label="Balance" name="balance" required>
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
        </UFormGroup>

        <!-- <UButton label="Save" type="submit" class="mx-auto" /> -->
      </UForm>
    </UCard>

    <UCard>
      <h2>Payment methods</h2>

      <div class="flex">
        <UButton label="Add payment method" icon="i-ion-plus" class="ml-auto" size="sm" @click="addNewPaymentMethod" />
      </div>

      <UTable :loading="paymentMethodPending" :rows="paymentMethods || []" :columns="paymentMethodColumns">
        <template #active-data="{ row }">
          <UIcon
            v-if="row._id === customer.activePaymentMethod?._id"
            name="i-mdi-check-decagram"
            class="text-green-500"
          />
          <div v-else />
        </template>

        <template #actions-data="{ row }">
          <UDropdown :items="paymentMethodActions(row)">
            <UButton color="gray" variant="ghost" icon="i-ion-ellipsis-horizontal" />
          </UDropdown>
        </template>
      </UTable>
    </UCard>

    <UCard>
      <h2>Subscriptions</h2>

      <UTable
        :loading="subscriptionPending"
        :rows="subscriptions || []"
        :columns="subscriptionColumns"
        @select="selectSubscription"
      >
        <template #status-data="{ row }">
          <UBadge v-if="row.status === 'active'" size="xs" label="Active" color="emerald" variant="subtle" />
          <UBadge v-else-if="row.status === 'error'" size="xs" label="Error" color="rose" variant="subtle" />
        </template>

        <template #lastPayment-data="{ row }">
          <span v-if="row.lastPayment">{{ formatDate(row.lastPayment) }}</span>
        </template>
      </UTable>
    </UCard>

    <UCard>
      <h2>Invoices</h2>

      <UTable :loading="invoicesPending" :rows="invoices || []" :columns="invoicesColumns" @select="selectInvoice">
        <template #date-data="{ row }">
          <span>{{ formatDate(row.date) }}</span>
        </template>

        <template #totalAmount-data="{ row }">
          <span>{{ formatCurrency(row.totalAmount, row.currency) }}</span>
        </template>

        <template #status-data="{ row }">
          <UBadge v-if="row.status === 'draft'" size="xs" label="Draft" color="primary" variant="subtle" />
          <UBadge v-else-if="row.status === 'pending'" size="xs" label="Pending" color="amber" variant="subtle" />
          <UBadge v-else-if="row.status === 'paid'" size="xs" label="Paid" color="emerald" variant="subtle" />
          <UBadge v-else-if="row.status === 'failed'" size="xs" label="Failed" color="rose" variant="subtle" />
        </template>
      </UTable>
    </UCard>
  </div>
</template>

<script lang="ts" setup>
import { ContentType } from '@geprog/gringotts-client';
import type { Invoice, PaymentMethod, Subscription } from '@geprog/gringotts-client';

const client = await useGringottsClient();
const route = useRoute();
const router = useRouter();
const customerId = route.params.customerId as string;

const disabled = true;

const { data: customer, refresh: updateCustomer } = useAsyncData(async () => {
  const { data } = await client.customer.getCustomer(customerId);
  return data;
});

const paymentMethodColumns = [
  {
    key: '_id',
    label: 'ID',
  },
  {
    key: 'name',
    label: 'Name',
    sortable: true,
  },
  {
    key: 'type',
    label: 'Type',
    sortable: true,
  },
  {
    key: 'active',
    label: 'Active',
  },
  {
    key: 'actions',
    label: 'Actions',
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

const subscriptionColumns = [
  {
    key: '_id',
    label: 'ID',
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
  },
  {
    key: 'nextPayment',
    label: 'Next payment',
    sortable: true,
  },
];
const { data: subscriptions, pending: subscriptionPending } = useAsyncData(async () => {
  const { data } = await client.customer.listCustomerSubscriptions(customerId);
  return data;
});

async function selectSubscription(row: Subscription) {
  await router.push(`/subscriptions/${row._id}`);
}

const invoicesColumns = [
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
    sortable: true,
  },
];
const { data: invoices, pending: invoicesPending } = useAsyncData(async () => {
  const { data } = await client.customer.listCustomerInvoices(customerId);
  return data;
});

async function selectInvoice(row: Invoice) {
  await router.push(`/invoices/${row._id}`);
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
