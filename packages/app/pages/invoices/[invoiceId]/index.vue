<template>
  <div v-if="invoice" class="w-full flex flex-col gap-4 max-w-4xl mx-auto">
    <div class="flex justify-between">
      <h1 class="text-xl">Invoice: {{ invoice.number }}</h1>

      <UBadge v-if="invoice.status === 'draft'" size="xs" label="Status: Draft" color="primary" variant="subtle" />
      <UBadge
        v-else-if="invoice.status === 'pending'"
        size="xs"
        label="Status: Pending"
        color="amber"
        variant="subtle"
      />
      <UBadge v-else-if="invoice.status === 'paid'" size="xs" label="Status: Paid" color="emerald" variant="subtle" />
      <UBadge v-else-if="invoice.status === 'failed'" size="xs" label="Status: Failed" color="rose" variant="subtle" />
    </div>

    <UCard>
      <div class="flex justify-end mb-2 gap-2 items-center">
        <UButton
          v-if="invoice.status !== 'draft'"
          :loading="preparingInvoice"
          label="Download"
          icon="i-ion-download"
          size="sm"
          @click="downloadInvoice"
        />

        <template v-if="subscription?.customer">
          <router-link :to="`/customers/${subscription.customer._id}`">
            <UButton :label="subscription.customer.name" icon="i-ion-people" size="sm" />
          </router-link>
          <router-link :to="`/subscriptions/${subscription._id}`">
            <UButton label="Subscription" icon="i-ion-md-refresh" size="sm" />
          </router-link>
        </template>
      </div>

      <UForm :state="invoice" class="flex flex-col gap-4">
        <UFormGroup label="Number" name="number">
          <UInput color="primary" variant="outline" v-model="invoice.number" size="lg" :disabled="disabled" />
        </UFormGroup>

        <UFormGroup label="Date" name="date">
          <DatePicker v-model="invoice.date" :disabled="disabled" />
        </UFormGroup>

        <UFormGroup label="Amount" name="amount">
          <UInput color="primary" variant="outline" v-model="invoice.amount" size="lg" :disabled="disabled">
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">{{ invoice.currency }}</span>
            </template>
          </UInput>
        </UFormGroup>

        <UFormGroup label="Vat rate " name="vatRate">
          <UInput color="primary" variant="outline" v-model="invoice.vatRate" size="lg" :disabled="disabled">
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">%</span>
            </template>
          </UInput>
        </UFormGroup>

        <UFormGroup label="Vat amount" name="vatAmount">
          <UInput color="primary" variant="outline" v-model="invoice.vatAmount" size="lg" :disabled="disabled">
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">{{ invoice.currency }}</span>
            </template>
          </UInput>
        </UFormGroup>

        <UFormGroup label="Currency" name="currency">
          <USelectMenu
            color="primary"
            variant="outline"
            v-model="invoice.currency"
            :options="['EUR', 'USD']"
            size="lg"
            :disabled="disabled"
          />
        </UFormGroup>

        <UFormGroup label="Total amount" name="totalAmount">
          <UInput color="primary" variant="outline" v-model="invoice.totalAmount" size="lg" :disabled="disabled">
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">{{ invoice.currency }}</span>
            </template>
          </UInput>
        </UFormGroup>

        <template v-if="subscription && subscription.customer">
          <UFormGroup label="Customer">
            <UInput
              color="primary"
              variant="outline"
              v-model="subscription.customer.name"
              size="lg"
              :disabled="disabled"
            />
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
  const { data } = await client.invoice.getInvoice(invoiceId);
  return data;
});

// none-draft invoices are not allowed to be changed anymore
const disabled = computed(() => invoice.value?.status !== 'draft');

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
  const { data } = await client.invoice.generateInvoiceDownloadLink(invoiceId);
  preparingInvoice.value = false;
  window.open(data.url, '_blank');
}

const { data: subscription } = useAsyncData(async () => {
  const subscriptionId = invoice.value?.subscription?._id;
  if (!subscriptionId) return null;

  const { data } = await client.subscription.getSubscription(subscriptionId);
  return data;
});
</script>