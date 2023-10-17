<template>
  <div>
    <h1 class="text-xl">Subscriptions</h1>

    <UTable
      :loading="pending"
      :rows="subscriptions || []"
      :columns="subscriptionColumns"
      @select="selectSubscription"
    />
  </div>
</template>

<script lang="ts" setup>
import { Subscription } from '@geprog/gringotts-client';

const router = useRouter();
const client = await useGringottsClient();

const subscriptionColumns = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
  },
  {
    key: 'email',
    label: 'Email',
    sortable: true,
  },
];

async function selectSubscription(row: Subscription) {
  await router.push(`/subscriptions/${row._id}`);
}

const { data: subscriptions, pending } = useAsyncData(async () => {
  const { data } = await client.subscription.subscriptionList(); // TODO
  return data;
});
</script>
