<template>
  <!-- 移植自 Bilibili-Evolved src/ui/SwitchBox.vue：role=switch + bar/thumb 结构 -->
  <button type="button" class="uh-switch" :class="{ checked: modelValue, disabled }" role="switch"
    :aria-checked="modelValue" :disabled="disabled" @click="toggle" @keydown.space.prevent="toggle">
    <span class="bar"><span class="thumb" /></span>
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

function toggle() {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue);
  }
}
</script>
