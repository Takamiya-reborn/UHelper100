<template>
  <div class="uh-feature-list">
    <div v-for="feature in features" :key="feature.id" class="uh-feature">
      <div class="uh-feature-row">
        <div class="uh-feature-main">
          <span class="uh-feature-name">{{ feature.name }}</span>
          <span class="uh-feature-desc">{{ feature.description }}</span>
        </div>
        <UhSwitch
          :model-value="!!enabledState[feature.id]"
          :disabled="needsAi(feature)"
          @update:model-value="setFeatureEnabled(feature, $event)"
        />
      </div>
      <p v-if="needsAi(feature)" class="uh-feature-warn">请先在「高级 → AI 解题」配置接口和密钥</p>
      <!-- 详情不点击展开：有进度/数据时自动出现，避免点击撑动面板高度 -->
      <div v-if="hasDetail(feature)" class="uh-feature-detail">
        <div v-if="feature.progress !== undefined" class="uh-progress">
          <span class="uh-progress-bar" :style="{ width: `${feature.progress}%` }" />
        </div>
        <div v-if="feature.progress !== undefined" class="uh-progress-row">
          <span>进度</span>
          <span>{{ feature.progress.toFixed(0) }}%</span>
        </div>
        <div v-for="(value, key) in feature.data" :key="key" class="uh-kv">
          <span class="uh-kv-key">{{ key }}</span>
          <span class="uh-kv-value">{{ value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import UhSwitch from '../ui/UhSwitch.vue';
import { features, enabledState, setFeatureEnabled } from '../features/registry';
import type { Feature } from '../features/feature';
import { isAiConfigured } from '../utils/ai';

// AI 配置响应式读取：高级页改完配置这里立即解锁
const aiConfigured = computed(() => isAiConfigured());

function needsAi(feature: Feature) {
  return Boolean(feature.requiresAi) && !aiConfigured.value;
}

function hasDetail(feature: Feature) {
  return feature.progress !== undefined || Object.keys(feature.data).length > 0;
}
</script>
