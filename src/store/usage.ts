import { useGmStorage } from "../composables/useGmStorage";
import { GM_getValue, GM_setValue } from "vite-plugin-monkey/dist/client";

// AI 解题用量统计（GM 持久化）：client.ts 的 askAI 每次请求时记账，高级页展示
// 测试连接（testAIConnection）不计入——它不是解题请求
export interface AiUsage {
  requests: number;
  success: number;
  failed: number;
  promptTokens: number;
  completionTokens: number;
}

// OpenAI 兼容响应里的 token 统计（部分厂商可能省略）
export interface AiTokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

const KEY = "uhelper100:usage";
const EMPTY_USAGE: AiUsage = {
  requests: 0,
  success: 0,
  failed: 0,
  promptTokens: 0,
  completionTokens: 0,
};

// 从存储现读一份完整计数（缺字段补零）
function load(): AiUsage {
  return { ...EMPTY_USAGE, ...GM_getValue(KEY, EMPTY_USAGE) };
}

// 响应式镜像（面板展示用）；真实计数走 recordUsage 的存储读改写
export const usage = useGmStorage<AiUsage>(KEY, { ...EMPTY_USAGE });

// 记一次解题请求的用量。多标签页同时运行时各自持有内存副本，直接在 ref 上 ++
// 会互相覆盖丢计数，所以每次都从 GM 存储现读现加再整体写回
export function recordUsage(success: boolean, token?: AiTokenUsage): void {
  const current = load();
  current.requests += 1;
  if (success) {
    current.success += 1;
  } else {
    current.failed += 1;
  }
  current.promptTokens += token?.prompt_tokens ?? 0;
  current.completionTokens += token?.completion_tokens ?? 0;
  GM_setValue(KEY, current);
  usage.value = current;
}

export function resetUsage() {
  usage.value = { ...EMPTY_USAGE };
}
