import { reactive } from "vue";
import { useGmStorage } from "../composables/useGmStorage";
import type { Feature } from "./feature";
import { behaviorFeatures } from "./behaviors";

// 功能注册表：新功能在这里加一行即可进 UI
export const features: Feature[] = [...behaviorFeatures];

const stored = useGmStorage<Record<string, boolean>>("uhelper100:features", {});

// 各功能的启用状态（响应式，UI 直接读）；默认取各功能的 defaultEnabled（缺省开），GM 已存的状态优先
export const enabledState = reactive<Record<string, boolean>>({
  ...Object.fromEntries(features.map((feature) => [feature.id, feature.defaultEnabled ?? true])),
  ...stored.value,
});

function persist() {
  stored.value = { ...enabledState };
}

export function setFeatureEnabled(feature: Feature, enabled: boolean) {
  enabledState[feature.id] = enabled;
  persist();
  if (enabled) {
    feature.start();
  } else {
    feature.stop();
  }
}

// 应用挂载时调用：恢复上次启用中的功能
export function initFeatures() {
  for (const feature of features) {
    if (enabledState[feature.id]) {
      feature.start();
    }
  }
}
