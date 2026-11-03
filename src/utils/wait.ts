// 轮询等待工具（迁移自 study/utils/helpers.js，改为可中断）
// 学习通 iframe 嵌套场景的节拍器

// 等待 iframe 内元素出现；isAborted 返回 true 时提前结束
// 返回值：true=元素已出现，false=等待被中止
export function waitElementLoaded(
  iframeWindow: Window,
  selector: string,
  isAborted: () => boolean = () => false,
): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      if (isAborted()) {
        clearInterval(timer);
        resolve(false);
      } else if (iframeWindow.document.querySelector(selector)) {
        clearInterval(timer);
        resolve(true);
      }
    }, 100);
  });
}

// 等待 iframe 文档加载完成；isAborted 返回 true 时提前结束（返回 false）
export function waitIframeLoaded(
  iframe: HTMLIFrameElement,
  isAborted: () => boolean = () => false,
): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      if (isAborted()) {
        clearInterval(timer);
        resolve(false);
      } else if (iframe.contentDocument?.readyState === "complete") {
        clearInterval(timer);
        resolve(true);
      }
    }, 100);
  });
}

// 间隔等待（秒），迁移自 study 的 sleep
export function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

// 带随机抖动的间隔等待（秒）：固定间隔逐题作答在服务端时间轴上是机器人节拍，
// ±jitter 比例的随机化让间隔分布 human 一点（jitter=0.25 即 0.75x~1.25x）
export function sleepJitter(seconds: number, jitter = 0.25): Promise<void> {
  const factor = 1 + (Math.random() * 2 - 1) * jitter;
  return sleep(Math.max(0.5, seconds * factor));
}
