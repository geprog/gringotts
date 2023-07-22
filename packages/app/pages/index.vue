<template>
  <div>
    <h1>Hello</h1>
    <pre>{{ project }}</pre>
  </div>
</template>

<script lang="ts" setup>
import { Project } from '@geprog/gringotts-client';
import { useGringottsClient } from 'compositions/useClient';

const client = useGringottsClient(sessionStorage.getItem('projectToken')!);
const project = ref<Project>(await client.customer.customerList());
</script>
