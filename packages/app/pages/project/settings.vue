<template>
  <div class="w-full max-w-4xl mx-auto flex flex-col gap-4">
    <h1 class="text-xl">Project settings</h1>

    <UCard v-if="project">
      <UForm :state="project" class="flex flex-col gap-4">
        <UFormGroup label="Name" name="name">
          <UInput color="primary" variant="outline" v-model="project.name" size="lg" disabled />
        </UFormGroup>

        <UFormGroup label="Payment provider" name="paymentProvider">
          <USelectMenu
            color="primary"
            variant="outline"
            v-model="project.paymentProvider"
            :options="['mollie', 'mocked']"
            size="lg"
            disabled
          />
        </UFormGroup>

        <UFormGroup label="Webhook url" name="webhookUrl">
          <UInput color="primary" variant="outline" v-model="project.webhookUrl" size="lg" disabled />
        </UFormGroup>

        <UFormGroup label="Currency" name="currency">
          <USelectMenu
            color="primary"
            variant="outline"
            v-model="project.currency"
            :options="['EUR', 'USD']"
            size="lg"
            disabled
          />
        </UFormGroup>

        <UFormGroup label="Vat rate" name="vatRate">
          <UInput color="primary" variant="outline" v-model="project.vatRate" size="lg" disabled>
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">%</span>
            </template>
          </UInput>
        </UFormGroup>

        <!-- <UButton label="Save" type="submit" class="mx-auto" /> -->
      </UForm>
    </UCard>

    <UCard v-if="project && project.invoiceData">
      <h2>Invoice data</h2>

      <UForm :state="project" class="flex flex-col gap-4">
        <UFormGroup label="Name" name="name">
          <UInput color="primary" variant="outline" v-model="project.invoiceData.name" size="lg" disabled />
        </UFormGroup>

        <UFormGroup label="Email" name="email">
          <UInput color="primary" variant="outline" v-model="project.invoiceData.email" size="lg" disabled />
        </UFormGroup>

        <UFormGroup label="Address line 1" name="addressLine1">
          <UInput color="primary" variant="outline" v-model="project.invoiceData.addressLine1" size="lg" disabled />
        </UFormGroup>

        <UFormGroup label="Address line 2" name="addressLine2">
          <UInput color="primary" variant="outline" v-model="project.invoiceData.addressLine2" size="lg" disabled />
        </UFormGroup>

        <UFormGroup label="City" name="city">
          <UInput color="primary" variant="outline" v-model="project.invoiceData.city" size="lg" disabled />
        </UFormGroup>

        <UFormGroup label="Zip" name="zipCode">
          <UInput color="primary" variant="outline" v-model="project.invoiceData.zipCode" size="lg" disabled />
        </UFormGroup>

        <UFormGroup label="Country" name="country">
          <UInput color="primary" variant="outline" v-model="project.invoiceData.country" size="lg" disabled />
        </UFormGroup>

        <!-- <UButton label="Save" type="submit" class="mx-auto" /> -->
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const client = await useGringottsClient();

const { data: project } = useAsyncData(async () => {
  const { data } = await client.project.getProject('token-project');
  return data;
});
</script>
