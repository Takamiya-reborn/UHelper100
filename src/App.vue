<template>
  <div class="uh-root" :data-dark="isDark">
    <Transition name="uh-slide">
      <div v-show="!visible" class="uh-dock">
        <button type="button" class="uh-dock-btn" title="UHelper100" @click="openPanel('status')">
          <svg viewBox="0 0 24 24">
            <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
          </svg>
        </button>
      </div>
    </Transition>

    <Transition name="uh-slide">
      <div v-show="visible" ref="panel" class="uh-panel" :class="{ dragging }" :style="panelStyle">
        <div ref="handle" class="uh-panel-header" @pointerdown="onPointerDown">
          <span class="uh-panel-title">UHelper100</span>
          <span class="uh-panel-version">v0.2.1</span>
          <button type="button" class="uh-close" title="关闭" @click="visible = false">
            <svg viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <UhTabs v-model="tab" :tabs="TABS" />
        <div class="uh-panel-body">
          <StatusView v-show="tab === 'status'" />
          <FeaturesView v-show="tab === 'tasks'" />
          <SettingsView v-show="tab === 'settings'" />
          <AdvancedView v-show="tab === 'advanced'" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import UhTabs from './ui/UhTabs.vue';
import FeaturesView from './views/FeaturesView.vue';
import StatusView from './views/StatusView.vue';
import SettingsView from './views/SettingsView.vue';
import AdvancedView from './views/AdvancedView.vue';
import { useDraggable } from './composables/useDraggable';
import { settings } from './store/settings';
import { initFeatures } from './features/registry';

const TABS = [
  { key: 'status', label: '状态' },
  { key: 'tasks', label: '功能' },
  { key: 'settings', label: '设置' },
  { key: 'advanced', label: '高级' },
];

const visible = ref(false);
const tab = ref('status');
const panel = ref<HTMLElement | null>(null);
const handle = ref<HTMLElement | null>(null);
const { position, dragging, onPointerDown } = useDraggable(handle, panel);

// 配色三态：dark/light 固定，system 监听系统主题实时切换
const prefersDark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
  prefersDark.value = event.matches;
});
const isDark = computed(() =>
  settings.value.theme === 'system' ? prefersDark.value : settings.value.theme === 'dark',
);

// 拖拽定位必须一并清掉 CSS 停靠的 right/translateY，否则写入 top 瞬间面板弹走
const panelStyle = computed(() =>
  position.value
    ? {
      left: `${position.value.left}px`,
      top: `${position.value.top}px`,
      right: 'auto',
      transform: 'none',
    }
    : {},
);

function openPanel(key: string) {
  // 已打开且就在该 tab 时，再点一次等于收起
  if (visible.value && tab.value === key) {
    visible.value = false;
    return;
  }
  // 不记忆位置：从关闭态打开时清掉拖拽定位，回到默认停靠位
  if (!visible.value) {
    position.value = null;
  }
  tab.value = key;
  visible.value = true;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    visible.value = false;
  }
}

// 点在面板外（宿主页面空白处）即收起；composedPath 穿透 shadow DOM 判断归属
function onOutsidePointerDown(event: PointerEvent) {
  if (!visible.value) {
    return;
  }
  if (panel.value && event.composedPath().includes(panel.value)) {
    return;
  }
  visible.value = false;
}

onMounted(() => {
  initFeatures();
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('pointerdown', onOutsidePointerDown);
});
</script>
