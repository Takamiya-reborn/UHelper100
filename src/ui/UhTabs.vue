<template>
  <!-- 移植自 Bilibili-Evolved src/ui/TabControl.vue 的头部结构 -->
  <div class="uh-tabs" role="tablist">
    <button v-for="tab in tabs" :key="tab.key" type="button" class="uh-tab" :class="{ active: tab.key === modelValue }"
      role="tab" :aria-selected="tab.key === modelValue" @click="emit('update:modelValue', tab.key)">
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  tabs: { key: string; label: string }[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();
</script>
