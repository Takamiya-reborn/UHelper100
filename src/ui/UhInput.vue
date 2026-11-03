<template>
  <!-- 移植自 Bilibili-Evolved src/ui/TextBox.vue 的交互样式 -->
  <input class="uh-input" :type="type" :value="modelValue" :placeholder="placeholder" :min="min" :max="max" :step="step"
    @input="onInput" />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string | number;
    type?: 'text' | 'number' | 'password';
    placeholder?: string;
    min?: number;
    max?: number;
    step?: number;
  }>(),
  { type: 'text' },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void;
}>();

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.type === 'number' ? target.valueAsNumber : target.value);
}
</script>
