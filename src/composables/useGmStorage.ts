import { ref, watch, type Ref } from "vue";
import { GM_getValue, GM_setValue } from "vite-plugin-monkey/dist/client";

// GM 存储响应式包装：读一次进 ref，深度 watch 回写（T 需可 JSON 序列化）
export function useGmStorage<T>(key: string, defaultValue: T): Ref<T> {
  const data = ref(GM_getValue(key, defaultValue)) as Ref<T>;
  watch(
    data,
    (value) => {
      GM_setValue(key, value);
    },
    { deep: true },
  );
  return data;
}
