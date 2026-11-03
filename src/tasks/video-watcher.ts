// 自动视频任务（迁移自 study/cx-actions.js 的 video/audio，重写完成检测）
// 检测策略：媒体事件（ended/pause）为主，isUnFinishJob 轮询降为 watchdog 兜底；
// 所有完成路径收口到 finish()，保证定时器与监听器必定清理；stop() 可随时中止
import { runtime } from "../store/runtime";
import { settings } from "../store/settings";
import type { CxPlayer, CxWindow } from "../utils/cx";
import { waitElementLoaded } from "../utils/wait";

// 一个可中止的观看任务；promise 在播放完成或中止后落定，由调用方继续下一任务
export interface WatchTask {
  promise: Promise<void>;
  stop(): void;
}

// isUnFinishJob 轮询频率：从原版 1s 放宽到 3s，只做服务端状态兜底校验
const WATCHDOG_INTERVAL = 3000;

// 静音 16 倍速观看视频任务点
export function watchVideo(iframeWindow: Window): WatchTask {
  let stopped = false;
  let stopHandler: (() => void) | null = null;

  const promise = (async () => {
    runtime.task.name = "视频";
    runtime.task.video.status = true;
    try {
      // 等待媒体元素就绪（中止时返回 false）
      const found = await waitElementLoaded(iframeWindow, "#video_html5_api", () => stopped);
      if (!found) return; // 已被 stop() 中止
      let player: CxPlayer;
      try {
        player = (iframeWindow as CxWindow).videojs("video_html5_api");
      } catch (error) {
        console.error("videojs 播放器获取失败", error);
        return;
      }
      const playButton = iframeWindow.document.querySelector<HTMLElement>(".vjs-big-play-button");
      // 已起播后大播放按钮会隐藏，恢复播放直接调 play()；被自动播放策略拦截时退回按钮
      const resume = () => player.play().catch(() => playButton?.click());

      await new Promise<void>((resolve) => {
        let done = false;
        let watchdog = 0;

        // 唯一收口：去重 resolve + 清理定时器/监听器
        const finish = () => {
          if (done) return;
          done = true;
          clearInterval(watchdog);
          player.off("pause", onPause);
          player.off("ended", onEnded);
          resolve();
        };

        // 平台防挂机会中途暂停：未播完就续播（代替原版对 pause 的猴子补丁）
        const onPause = () => {
          if (!done && player.currentTime() < player.duration()) resume();
        };
        const onEnded = () => {
          console.log("视频播放完成");
          finish();
        };

        player.on("pause", onPause);
        player.on("ended", onEnded);
        player.muted(true);
        // 倍速用户可配（默认 1 不倍速）：倍速越高服务端进度时间轴越假，统计上越显眼
        const rate = Math.min(16, Math.max(1, settings.value.watchRate || 1));
        player.playbackRate(rate);
        resume();

        // 页面未挂 isUnFinishJob 时不轮询，交给 ended 事件判定
        const cxWindow = iframeWindow as CxWindow;
        if (cxWindow.isUnFinishJob) {
          watchdog = setInterval(() => {
            if (done) return;
            cxWindow.isUnFinishJob!() ? player.paused() && resume() : finish();
          }, WATCHDOG_INTERVAL);
        }

        stopHandler = finish;
      });
    } finally {
      runtime.task.video.status = false;
    }
  })();

  return {
    promise,
    stop() {
      stopped = true;
      stopHandler?.();
    },
  };
}

// 静音观看音频任务点（纯 HTMLAudioElement，无 isUnFinishJob 校验，沿用原版行为）
export function watchAudio(iframeWindow: Window): WatchTask {
  let stopped = false;
  let stopHandler: (() => void) | null = null;

  const promise = (async () => {
    runtime.task.name = "视频音频";
    const found = await waitElementLoaded(iframeWindow, "#audio_html5_api", () => stopped);
    if (!found) return;
    const audio = iframeWindow.document.querySelector<HTMLAudioElement>("#audio_html5_api");

    await new Promise<void>((resolve) => {
      let done = false;
      let watchdog = 0;

      const finish = () => {
        if (done) return;
        done = true;
        clearInterval(watchdog);
        audio?.removeEventListener("ended", onEnded);
        resolve();
      };
      const onEnded = () => finish();

      audio?.addEventListener("ended", onEnded);
      if (audio) {
        audio.muted = true;
        audio.autoplay = true;
        audio.volume = 0;
        audio.play().catch(() => {});
      }
      // 自动播放被浏览器拦截时持续重试，用户任意交互后即成功（原版为弹窗确认，此处静默重试）
      watchdog = setInterval(() => {
        if (!done && audio && audio.paused && !audio.ended) audio.play().catch(() => {});
      }, 1000);

      stopHandler = finish;
    });
  })();

  return {
    promise,
    stop() {
      stopped = true;
      stopHandler?.();
    },
  };
}

// 当前正在执行的观看任务，由 tasks/entry-router.ts 分派时登记
let activeTask: WatchTask | null = null;

// 供章节路由分派：执行观看任务并登记为当前任务，完成或中止后自动注销
export function runWatch(kind: "video" | "audio", iframeWindow: Window): Promise<void> {
  const task = kind === "video" ? watchVideo(iframeWindow) : watchAudio(iframeWindow);
  activeTask = task;
  return task.promise.finally(() => {
    if (activeTask === task) activeTask = null;
  });
}

// 中止当前观看任务（功能开关关闭时调用）
export function abortActiveWatch() {
  activeTask?.stop();
  activeTask = null;
}
