<template>
  <div class="uh-settings">
    <section class="uh-group">
      <h3 class="uh-group-title">常规</h3>
      <div class="uh-segments" role="radiogroup" aria-label="配色">
        <!-- 滑块：translateX 按选中项索引平移，选项等宽所以 100% = 一格宽 -->
        <span class="uh-segments-thumb" :style="{ transform: `translateX(${themeIndex * 100}%)` }" />
        <button
          v-for="option in THEME_OPTIONS"
          :key="option.value"
          type="button"
          class="uh-segment"
          :class="{ active: settings.theme === option.value }"
          role="radio"
          :aria-checked="settings.theme === option.value"
          @click="settings.theme = option.value"
        >
          {{ option.label }}
        </button>
      </div>
      <div class="uh-field">
        <div class="uh-field-label">
          <label>通用间隔（秒）</label>
          <p>脚本运行各步骤间的切换间隔</p>
        </div>
        <UhInput v-model="settings.interval" type="number" :min="1" :max="60" :step="1" />
      </div>
      <div class="uh-field stack">
        <div class="uh-field-label">
          <label>观看倍速</label>
          <p :class="rateTone">{{ rateHint }}</p>
        </div>
        <UhSlider v-model="settings.watchRate" :min="1" :max="16" :ticks="[1, 2, 4, 8, 16]" unit="x" />
      </div>
    </section>
    <section class="uh-group">
      <h3 class="uh-group-title">答题</h3>
      <div class="uh-field">
        <div class="uh-field-label">
          <label>章节测验自动提交</label>
          <p>开启后，正确率达标会自动提交，不足则暂存</p>
        </div>
        <UhSwitch v-model="settings.autoSubmitChapter" />
      </div>
      <div class="uh-field">
        <div class="uh-field-label">
          <label>考试自动提交</label>
          <p>开启后，最后一题答完会自动交卷（交卷不可逆）</p>
        </div>
        <UhSwitch v-model="settings.autoSubmitExam" />
      </div>
      <div class="uh-field">
        <div class="uh-field-label">
          <label>答题间隔（秒）</label>
          <p>逐题作答的间隔，控制答题速度</p>
        </div>
        <UhInput v-model="settings.answerInterval" type="number" :min="1" :max="60" :step="1" />
      </div>
      <div class="uh-field">
        <div class="uh-field-label">
          <label>最低正确率</label>
          <p>不满足最低正确率则不会自动提交，0-1</p>
        </div>
        <UhInput v-model="settings.minAccuracy" type="number" :min="0" :max="1" :step="0.05" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import UhSwitch from '../ui/UhSwitch.vue';
import UhInput from '../ui/UhInput.vue';
import UhSlider from '../ui/UhSlider.vue';
import { settings, type Theme } from '../store/settings';

// 配色三态，顺序即面板展示顺序
const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'dark', label: '深色' },
  { value: 'light', label: '浅色' },
  { value: 'system', label: '跟随系统' },
];

const themeIndex = computed(() => THEME_OPTIONS.findIndex((option) => option.value === settings.value.theme));

// 倍速风险分级的文案与配色（档位 [1, 2, 4, 8, 16]）
const rateHint = computed(() => {
  const rate = settings.value.watchRate;
  if (rate >= 16) return '演都不演了';
  if (rate >= 4) return '你最好祈祷他查得不严';
  if (rate >= 2) return '你好像在拖动进度条';
  return '中规中矩';
});

const rateTone = computed(() => {
  const rate = settings.value.watchRate;
  if (rate >= 16) return 'tone-bad';
  if (rate >= 4) return 'tone-warn';
  if (rate >= 2) return 'tone-mid';
  return 'tone-ok';
});
</script>
