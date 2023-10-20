<template>
  <UPopover :popper="{ placement: 'bottom-start' }" class="w-full">
    <UButton
      icon="i-heroicons-calendar-days-20-solid"
      :label="label"
      variant="outline"
      class="w-full"
      :disabled="disabled"
    />
    <template #panel="{ close }">
      <VCalendarDatePicker
        v-model="innerModel"
        transparent
        :mode="mode"
        borderless
        :attributes="{
          key: 'today',
          highlight: {
            color: 'blue',
            fillMode: 'outline',
            class: '!bg-zinc-100 dark:!bg-zinc-800',
          },
          dates: new Date(),
        }"
        hide-time-header
        is24hr
        :is-dark="isDark"
        trim-weeks
        :first-day-of-week="2"
        :disabled="disabled"
        @close="close"
      />
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { DatePicker as VCalendarDatePicker } from 'v-calendar';
import 'v-calendar/dist/style.css';

const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');

const props = withDefaults(
  defineProps<{
    modelValue: string | Date | undefined;
    mode?: 'date' | 'dateTime';
    disabled: boolean;
  }>(),
  {
    mode: 'dateTime',
  },
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: Date | undefined): void;
}>();

const innerModel = computed<Date | undefined>({
  get() {
    if (!props.modelValue) {
      return undefined;
    }

    return new Date(props.modelValue);
  },
  set(date) {
    emit('update:modelValue', date);
  },
});

const label = computed(() => {
  if (!innerModel.value) {
    return '';
  }

  if (props.mode === 'date') {
    return formatDate(innerModel.value);
  }

  return formatDateTime(innerModel.value);
});
</script>
