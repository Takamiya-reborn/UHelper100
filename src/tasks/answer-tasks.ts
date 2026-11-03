// AI 答题流程：章节测验 / 作业 / 考试（迁移自 study/cx-actions.js 的 work/homework/exam）
// 题库方案废弃：getAnswers 三源并发改为 askAI 单来源
// 共享逐题循环：sleep(answerInterval) → 写 runtime → askAI → fillAnswer → 更新状态
import { runtime, type TaskQuestion } from "../store/runtime";
import { settings } from "../store/settings";
import { askAI, isAiConfigured } from "../utils/ai";
import { fillAnswer } from "./answer-fill";
import { decode } from "./font-decode";
import {
  parseChapterQuestion,
  parseExamQuestion,
  parseHomeworkQuestion,
  type ParsedQuestion,
} from "./question-parse";
import type { CxWorkWindow } from "../utils/cx";
import { sleep, sleepJitter } from "../utils/wait";

interface WorkQuestion {
  parsed: ParsedQuestion;
  el: Element;
  record: TaskQuestion;
}

// 答题前置校验：开关开着但 AI 配置被清空（如高级页清了 key），直接拒绝而不是逐题报错
function assertAiReady(taskName: string): boolean {
  if (isAiConfigured()) return true;
  console.warn(`[UHelper100] AI 未配置，${taskName}流程跳过（请在面板「高级 → AI 解题」配置）`);
  return false;
}

// 初始化 runtime 题目列表（StatusView 渲染数据源）
function initRuntime(name: string, items: { parsed: ParsedQuestion; el: Element }[]): WorkQuestion[] {
  runtime.task.name = name;
  runtime.task.video.status = false;
  runtime.count = items.length;
  runtime.task.work.questionList = items.map((item) => ({
    question: item.parsed.question,
    answer: null,
    status: "",
    el: item.el,
  }));
  runtime.task.work.inx = 0;
  return items.map((item, i) => ({
    parsed: item.parsed,
    el: item.el,
    record: runtime.task.work.questionList[i],
  }));
}

// 逐题循环：返回成功匹配答案数；isAborted 为真时立即停止（不填涂不提交）
// 对照原版：await sleep(answerInterval) → askStore.insert → getAnswers → fillAnswer → status 更新
// 失败原因直接写入面板答案区（danger 态），不只在控制台打日志
async function answerAll(
  questions: WorkQuestion[],
  iframeWindow: Window,
  isAborted: () => boolean,
  decodeStatus?: string,
): Promise<number> {
  let succ = 0;
  for (let i = 0; i < questions.length; i++) {
    const { parsed, el, record } = questions[i];
    // 固定间隔是机器人节拍，±25% 抖动让服务端时间轴上的作答间隔不那么规律
    await sleepJitter(settings.value.answerInterval);
    if (isAborted()) return succ;
    runtime.task.work.inx = i;
    let filled: string[] | null = null;
    let failure: string | null = null;
    try {
      const result = await askAI(parsed);
      filled = fillAnswer(result, parsed, el, iframeWindow);
      if (!filled) {
        failure =
          `AI 回复「${result.answer.join("，")}」未能对应到选项` +
          (parsed.options.length > 0 ? `：[${parsed.options.join(" / ")}]` : "（页面未解析到选项）") +
          (decodeStatus ? `（字体解码：${decodeStatus}）` : "");
      }
    } catch (error) {
      failure = `AI 请求失败：${error instanceof Error ? error.message : String(error)}`;
    }
    if (filled) {
      record.status = "primary";
      record.answer = filled.join(" # ");
      succ++;
    } else {
      record.status = "danger";
      record.answer = failure ?? "作答失败";
    }
  }
  return succ;
}

// 章节测验（对照 Cx.work）：解析 .TiMu → 逐题 → autoSubmitChapter/minAccuracy 提交分流
// isAborted：换章时为真，绝不提交半套卷（原版无此保护）
export async function runChapterWork(iframeWindow: Window, isAborted: () => boolean): Promise<void> {
  if (!assertAiReady("章节测验")) return;
  const decodeStatus = decode(iframeWindow);
  const timuList = Array.from(iframeWindow.document.querySelectorAll(".TiMu"));
  const items = timuList
    .map((el) => ({ el, parsed: parseChapterQuestion(el) }))
    .filter((item): item is { el: Element; parsed: ParsedQuestion } => item.parsed !== null);
  if (items.length === 0) {
    console.warn("[UHelper100] 章节测验未解析到题目（.TiMu / .fontLabel / answertype 未命中）");
    return;
  }
  console.log(`[UHelper100] 章节测验解析到 ${items.length} 题`);
  const questions = initRuntime("章节测验", items);

  const succ = await answerAll(questions, iframeWindow, isAborted, decodeStatus);
  if (isAborted()) return;

  const win = iframeWindow as CxWorkWindow;
  if (settings.value.autoSubmitChapter) {
    if (succ / questions.length < settings.value.minAccuracy) {
      // 正确率不足：临时劫持 alert 吞掉平台弹窗，走「暂存不提交」；用完立刻还原，
      // 避免页面后续代码撞上非原生的 alert（toString 检查可发现劫持）
      console.log(`[UHelper100] 正确率不足 ${succ}/${questions.length}，暂存不提交`);
      const originalAlert = iframeWindow.alert;
      iframeWindow.alert = () => {};
      try {
        win.noSubmit?.();
      } finally {
        iframeWindow.alert = originalAlert;
      }
    } else {
      win.btnBlueSubmit?.();
      await sleep(3);
      win.submitCheckTimes?.();
      console.log(`[UHelper100] 章节测验已提交，正确率 ${succ}/${questions.length}`);
    }
  } else {
    console.log(`[UHelper100] 未开启自动提交，等待手动提交，正确率 ${succ}/${questions.length}`);
  }
}

// 作业页（对照 Cx.homework，dowork 路由顶层文档 .questionLi）：逐题填涂，不提交（源码如此）
export async function runHomework(): Promise<void> {
  if (!assertAiReady("作业")) return;
  const questionList = Array.from(document.querySelectorAll(".questionLi"));
  const items = questionList
    .map((el) => ({ el, parsed: parseHomeworkQuestion(el) }))
    .filter((item): item is { el: Element; parsed: ParsedQuestion } => item.parsed !== null);
  if (items.length === 0) return;
  const questions = initRuntime("作业", items);

  await answerAll(questions, window, () => false);
  console.log("[UHelper100] 作业已完成作答");
}

// 考试页（对照 Cx.exam）：单题整页，填涂 .mark_table；答完自动切下一题（并入自动答题，不再单设开关）。
// 最后一题没有「下一题」按钮，按「考试自动提交」开关决定是否点交卷
export async function runExam(): Promise<void> {
  if (!assertAiReady("考试")) return;
  const parsed = parseExamQuestion(document);
  const markTable = document.getElementsByClassName("mark_table")[0];
  if (!parsed || !markTable) return;
  const questions = initRuntime("考试", [{ parsed, el: markTable }]);

  await answerAll(questions, window, () => false);

  await sleepJitter(settings.value.answerInterval);
  // 原版 jQuery .nextDiv .jb_btn:contains("下一题") 的原生等价
  const navButtons = Array.from(document.querySelectorAll<HTMLElement>(".nextDiv .jb_btn"));
  const nextButton = navButtons.find((btn) => btn.textContent?.includes("下一题"));
  if (nextButton) {
    nextButton.click();
    return;
  }
  // 最后一题：找「提交/交卷」按钮
  if (settings.value.autoSubmitExam) {
    const submitButton = navButtons.find((btn) => /提交|交卷/.test(btn.textContent ?? ""));
    if (submitButton) {
      submitButton.click();
      console.log("[UHelper100] 考试已答完，已自动交卷");
    } else {
      console.log("[UHelper100] 未找到「提交/交卷」按钮，请检查答案后手动交卷");
    }
  } else {
    console.log("[UHelper100] 已是最后一题，未开启考试自动提交，请检查答案后手动交卷");
  }
}
