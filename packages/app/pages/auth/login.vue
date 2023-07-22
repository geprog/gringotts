<template>
  <div class="flex flex-col mx-auto max-w-xl w-full mt-8">
    <h1 class="mx-auto">login</h1>

    <form @submit.prevent="login">
      <input v-model="projectToken" type="password" placeholder="project token" />
      <input type="submit" value="login" />
    </form>
  </div>
</template>

<script lang="ts" setup>
const router = useRouter();

const projectToken = ref('');

async function login() {
  await useFetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ projectToken: projectToken.value }),
  });

  await router.push('/');
}
</script>
