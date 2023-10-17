<template>
  <div class="w-full">
    <h1 class="text-xl">Project settings</h1>

    <pre>{{ project }}</pre>
  </div>
</template>

<script setup lang="ts">
const client = await useGringottsClient();

const { data: project } = useAsyncData(async () => {
  const projectId = ''; // TODO: get project id
  const { data } = await client.project.projectDetail(projectId);
  return data;
});
</script>
