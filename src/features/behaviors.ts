import { reactive } from "vue";
import type { Feature } from "./feature";
import { abortActiveWatch } from "../tasks/video-watcher";
import { startKeepAwake, stopKeepAwake } from "../tasks/keep-awake";

// 行为开关型功能：默认无生命周期逻辑，接了自动化逻辑的开关单独传入生命周期
function createBehavior(
  id: string,
  name: string,
  description: string,
  lifecycle: { start?: () => void; stop?: () => void } = {},
): Feature {
  return {
    id,
    name,
    description,
    data: reactive<Record<string, string>>({}),
    start() {
      lifecycle.start?.();
    },
    stop() {
      lifecycle.stop?.();
    },
  };
}

// 行为开关（来自 study/config.js 的 defaultConfig，默认全开）
export const behaviorFeatures: Feature[] = [
  // 自动视频：分派入口在 tasks/entry-router.ts，关闭开关即中止进行中的观看任务
  createBehavior(
    "auto-video",
    "自动视频",
    "开启后，会自动观看视频（含音频）",
    { stop: abortActiveWatch },
  ),
  { ...createBehavior("auto-answer", "自动答题", "开启后，会自动答题"), requiresAi: true },
  createBehavior("auto-jump", "自动切换", "开启后，会自动切换章节"),
  // 防降速：默认关——标签页会出现喇叭图标，需要用户知情后自己决定
  createBehavior(
    "keep-awake",
    "防降速",
    "切走标签页后浏览器会限制定时器使挂机变慢；开启后播放一段不可闻的静音音频保持前台速度（标签页会出现🔊图标）。无法对抗系统休眠",
    { start: startKeepAwake, stop: stopKeepAwake },
  ),
];
