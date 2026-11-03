<template>
  <!-- 原生滑条 + accent-color：轨道填充与滑块随主题变量着色，无需逐厂商伪元素定制 -->
  <div class="uh-slider">
    <div class="uh-slider-track">
      <!-- 档位模式：轨道映射为档位下标（0..n-1，step 1），滑块只能落在档位上 -->
      <input
        type="range"
        :value="sliderValue"
        :min="ticks ? 0 : min"
        :max="sliderMax"
        :step="ticks ? 1 : step"
        :aria-valuetext="`${modelValue}${unit}`"
        @input="onInput"
      />
      <div v-if="ticks" class="uh-slider-ticks" aria-hidden="true">
        <span v-for="tick in ticks" :key="tick">{{ tick }}{{ unit }}</span>
      </div>
    </div>
    <!-- 档位模式下数值已在轨道下方标注，左侧不再重复显示 -->
    <span v-if="!ticks" class="uh-slider-value" :class="valueClass">{{ modelValue }}{{ unit }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: number;
    min?: number;
    max?: number;
    step?: number;
    /** 数值后的单位后缀（如 x、%） */
    unit?: string;
    /** 固定档位：轨道只有档位数个停靠点，滑块逐档跳动 */
    ticks?: number[];
    /** 当前值展示的着色 class（按业务语义分级，如档位风险色） */
    valueClass?: string;
  }>(),
  { min: 0, max: 100, step: 1, unit: '', ticks: undefined, valueClass: '' },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void;
}>();

const sliderMax = computed(() => (props.ticks ? props.ticks.length - 1 : props.max));

// 当前值落在的档位下标（旧存档里不在档位上的值归到最近档）
const sliderValue = computed(() => {
  if (!props.ticks) return props.modelValue;
  let best = 0;
  for (let i = 1; i < props.ticks.length; i++) {
    if (Math.abs(props.ticks[i] - props.modelValue) < Math.abs(props.ticks[best] - props.modelValue)) {
      best = i;
    }
  }
  return best;
});

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', props.ticks ? props.ticks[target.valueAsNumber] : target.valueAsNumber);
}
</script>
