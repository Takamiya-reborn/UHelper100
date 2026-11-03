// 章节路由（迁移自 study/entry-router.js 的章节页主循环，重写并发安全）
// 链路：顶层文档等待 #iframe → 扫描任务点 → 按类型分派（video/audio/pdf）→ 切章 → 2s URL 轮询触发下一章
// 相比原版的优化：换章时中止上一章仍在进行的观看任务（原版会双任务并行）；work/考试链路待迁移，暂跳过
import { enabledState } from "../features/registry";
import { runtime } from "../store/runtime";
import { settings } from "../store/settings";
import type { CxTopWindow } from "../utils/cx";
import { runWatch, abortActiveWatch } from "./video-watcher";
import { runChapterWork, runExam, runHomework } from "./answer-tasks";
import { sleepJitter, waitElementLoaded, waitIframeLoaded } from "../utils/wait";

// 章节页路径（新版 mooc2）；旧版路径会强制带 mooc2=1 重定向
const STUDY_PATHS = new Set([
  "/mycourse/studentstudy",
  "/mooc-ans/mycourse/studentstudy",
  "/mooc2-ans/mycourse/studentstudy",
]);

// 作业页与考试页路径（对照 entry-router.js:87-93）
const HOMEWORK_PATHS = new Set(["/mooc2/work/dowork", "/mooc-ans/mooc2/work/dowork", "/mooc2-ans/mooc2/work/dowork"]);
const EXAM_PATHS = new Set(["/exam-ans/exam/test/reVersionTestStartNew"]);

// iframe SPA 换章不刷新页面，靠轮询 cards iframe 的 URL 变化触发重跑（沿用原版节拍）
const URL_POLL_INTERVAL = 2000;

// 功能开关在每次分派时现读现判（enabledState 响应式，改开关立即生效）
const isFeatureOn = (id: string) => Boolean(enabledState[id]);

// 路由为单例：generation 递增作废旧一轮，防止换章后新旧两轮并行（原版无此保护）
let generation = 0;

export function startEntryRouter(): void {
  // 作业/考试是独立整页路由，直接跑对应流程（受 auto-answer 开关门控）
  if (HOMEWORK_PATHS.has(location.pathname)) {
    if (isFeatureOn("auto-answer")) void runHomework();
    return;
  }
  if (EXAM_PATHS.has(location.pathname)) {
    if (isFeatureOn("auto-answer")) void runExam();
    return;
  }
  if (!STUDY_PATHS.has(location.pathname)) return;
  if (!location.href.includes("mooc2=1")) {
    location.href = `${location.href}&mooc2=1`;
    return;
  }
  let currentUrl = "";
  setInterval(async () => {
    const cards = await cardsIframe();
    const href = cards?.contentWindow?.location.href;
    if (!cards || !href || href === currentUrl) return;
    currentUrl = href;
    abortActiveWatch(); // 换章即中止上一章的观看任务
    generation += 1;
    resetTaskState();
    void runChapterTasks(generation, cards);
  }, URL_POLL_INTERVAL);
}

// 等待章节容器 iframe 出现并加载完成
async function cardsIframe(): Promise<HTMLIFrameElement | null> {
  const found = await waitElementLoaded(window, "#iframe");
  if (!found) return null;
  const iframe = document.querySelector<HTMLIFrameElement>("#iframe");
  if (!iframe) return null;
  const loaded = await waitIframeLoaded(iframe);
  return loaded ? iframe : null;
}

function resetTaskState() {
  runtime.task.name = "暂未加载";
  runtime.task.video.status = false;
  runtime.task.work.questionList = [];
  runtime.task.work.inx = 0;
  runtime.count = 0;
}

async function runChapterTasks(gen: number, cards: HTMLIFrameElement): Promise<void> {
  const cardsWindow = cards.contentWindow;
  if (!cardsWindow) return;
  // 页面自带的任务点定位函数，不存在时忽略
  (window as CxTopWindow).scroll2Job?.();

  const jobList = Array.from(cardsWindow.document.querySelectorAll<HTMLElement>(".ans-job-icon"));
  for (const item of jobList) {
    if (gen !== generation) return; // 已换章，本轮作废
    const container = item.parentElement;
    const iframe = container?.querySelector<HTMLIFrameElement>("iframe");
    if (!iframe) continue;

    if (container?.classList.contains("ans-job-finished")) {
      console.log("[UHelper100] 已完成任务点，跳过", iframe.src);
      continue;
    }
    const loaded = await waitIframeLoaded(iframe);
    if (gen !== generation) return;
    if (!loaded || !iframe.contentWindow) continue;
    console.log("[UHelper100] 任务点:", iframe.src);

    if (/\/ananas\/modules\/video\//.test(iframe.src)) {
      if (!isFeatureOn("auto-video")) {
        console.log("[UHelper100] 视频任务已跳过（自动视频未开启）");
        continue;
      }
      await watch("video", iframe.contentWindow);
    } else if (/\/ananas\/modules\/audio\//.test(iframe.src)) {
      if (!isFeatureOn("auto-video")) {
        console.log("[UHelper100] 音频任务已跳过（自动视频未开启）");
        continue;
      }
      await watch("audio", iframe.contentWindow);
    } else if (/\/ananas\/modules\/pdf\//.test(iframe.src)) {
      scrollPdf(iframe);
    } else if (/\/ananas\/modules\/work\//.test(iframe.src)) {
      // 章节测验：真实答题页是任务点 iframe 内的嵌套 iframe（对照 entry-router.js:54-55）
      if (!isFeatureOn("auto-answer")) {
        console.log("[UHelper100] 章节测验已跳过（自动答题未开启）");
        continue;
      }
      const workIframe = iframe.contentDocument?.querySelector<HTMLIFrameElement>("iframe");
      if (workIframe) {
        const workLoaded = await waitIframeLoaded(workIframe);
        if (gen !== generation) return;
        if (workLoaded && workIframe.contentWindow) {
          await runChapterWork(workIframe.contentWindow, () => gen !== generation);
        }
      } else {
        // 兜底：页面结构若已无嵌套 iframe，直接在任务点文档里找题目
        console.warn("[UHelper100] 未找到嵌套答题 iframe，尝试直接解析任务点文档");
        await runChapterWork(iframe.contentWindow, () => gen !== generation);
      }
    } else {
      console.log("[UHelper100] 未知任务点，跳过", iframe.src);
    }
  }

  if (gen !== generation) return;
  await sleepJitter(settings.value.interval);
  if (gen !== generation) return;
  if (isFeatureOn("auto-jump")) {
    document.querySelector<HTMLElement>(".nextChapter")?.click();
  }
}

// 观看任务不会 reject（内部已收口），此处兜底防御，避免异常打断整轮循环
async function watch(kind: "video" | "audio", iframeWindow: Window): Promise<void> {
  try {
    await runWatch(kind, iframeWindow);
  } catch (error) {
    console.error("[UHelper100] 观看任务异常", error);
  }
}

// pdf 任务点：滚到内嵌预览 iframe 底部即视为完成（沿用原版行为）
function scrollPdf(iframe: HTMLIFrameElement): void {
  const panView = iframe.contentWindow?.document.querySelector<HTMLIFrameElement>("#panView");
  const previewWindow = panView?.contentWindow;
  if (!previewWindow?.document.body) return;
  previewWindow.scrollTo(0, previewWindow.document.body.scrollHeight);
}
