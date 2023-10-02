<template>
  <div>
    <aside class="h-screen w-58 border-l-1">
      <nav class="p-4">
        <MenuItem title="Customer" />
        <MenuItem title="Subscriptions" />
        <MenuItem title="Invoices" />
        <MenuItem title="Plans" />
      </nav>
    </aside>
    <main>
      <slot />
    </main>
  </div>
</template>

<script lang="ts" setup>
// import '@picocss/pico';
</script>

<style scoped>
* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}
</style>
