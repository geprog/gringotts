<template>
  <div class="mx-auto w-full max-w-xl flex flex-col gap-4 mt-8">
    <h1>Customer: {{ customer.name }}</h1>

    <div class="rounded-md">
      <form>
        <label for="name">
          Name
          <input v-model="customer.name" type="text" id="name" name="name" placeholder="Name" required />
        </label>

        <label for="email">
          Email
          <input v-model="customer.email" type="email" id="email" name="email" placeholder="Email" required />
        </label>

        <label for="addressLine1">
          Address line 1
          <input
            v-model="customer.addressLine1"
            type="text"
            id="addressLine1"
            name="addressLine1"
            placeholder="addressLine1"
          />
        </label>

        <label for="addressLine2">
          Address line 2
          <input
            v-model="customer.addressLine2"
            type="text"
            id="addressLine2"
            name="addressLine2"
            placeholder="addressLine2"
          />
        </label>

        <label for="city">
          City
          <input v-model="customer.city" type="text" id="addressLine2" name="city" placeholder="city" />
        </label>

        <label for="zipCode">
          Zip code
          <input v-model="customer.zipCode" type="text" id="zipCode" name="zipCode" placeholder="zipCode" />
        </label>

        <label for="country">
          Country
          <input v-model="customer.country" type="text" id="country" name="country" placeholder="country" />
        </label>

        <label for="balance">
          Balance
          <input model-value="customer.balance" type="text" id="balance" read-only />
        </label>

        <button type="submit">Save</button>
      </form>
    </div>

    <div class="rounded-md">
      <h2>Payment methods</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">name</th>
            <th scope="col">type</th>
            <th scope="col">active</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="paymentMethod in paymentMethods" :key="paymentMethod._id">
            <td>{{ paymentMethod.name }}</td>
            <td>{{ paymentMethod.type }}</td>
            <td>{{ paymentMethod._id === customer.activePaymentMethod ? 'active' : '' }}</td>
          </tr>
          <tr>
            <td colspan="2" />
            <td>
              <button class="ml-auto">+ Add</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="rounded-md">
      <h2>Subscriptions</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">activeUntil</th>
            <th scope="col">anchorDate</th>
            <th scope="col">active</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="subscription in subscriptions" :key="subscription._id">
            <td>
              <nuxt-link :to="`/customers/${customerId}/subscriptions/${subscription._id}`">{{
                subscription.activeUntil
              }}</nuxt-link>
            </td>
            <td>{{ subscription.anchorDate }}</td>
            <td>{{ subscription.lastPayment }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Subscription } from '@geprog/gringotts-client';
import { useGringottsClient } from '~/compositions/useClient';

const client = useGringottsClient();
const route = useRoute();
const customerId = route.params.customerId as string;
const customer = ref((await client.customer.customerDetail(customerId)).data);
const paymentMethods = ref((await client.customer.paymentMethodDetail(customerId)).data);
const subscriptions = ref<Subscription[]>();
</script>
