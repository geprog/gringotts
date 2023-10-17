<template>
  <div class="flex flex-col space-y-2 text-center justify-center items-center">
    <img src="/logo_light.svg" alt="Gringotts logo" class="w-32 dark:hidden" />
    <img src="/logo_dark.svg" alt="Gringotts dark logo" class="w-32 hidden dark:block" />

    <h1 class="text-3xl font-semibold tracking-tight">Sign In to Your Account</h1>
  </div>
  <div class="grid gap-6">
    <form class="flex flex-col gap-2" @submit.prevent="login">
      <UInput
        color="primary"
        variant="outline"
        v-model="token"
        type="password"
        placeholder="Your Gringotts project token"
        size="lg"
      />

      <button
        class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 duration-200 border border-input hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 bg-background"
        type="submit"
      >
        Login
      </button>
    </form>
  </div>
</template>

<script lang="ts" setup>
definePageMeta({ layout: 'auth' });

const token = ref('');
const router = useRouter();

async function login() {
  await $fetch('/api/auth/login', {
    method: 'POST',
    body: { token: token.value },
  });
  await router.push('/');
}
</script>
