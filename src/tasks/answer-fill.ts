// 答案匹配与填涂（迁移自 study/parser/answer-fill.js，jQuery 改原生 DOM，选择器逐条对照源码）
// setAnswer 题型分派：单选/多选(0,1) 文本匹配 → 下标 → 多路 click 兼容皮肤；判断(3) 同义词正则；
// 填空/简答(2,4-7) UEditor setContent
// 注意：jQuery 的 :radio/:checkbox 是扩展选择器，原生用 input[type=...]；
// 选项点击范围严格限定首个 ul（对照源码 ul:eq(0) li ...）
import type { AnswerResult } from "../utils/ai";
import type { ParsedQuestion } from "./question-parse";
import { removeHtml } from "./question-parse";
import type { CxUEWindow } from "../utils/cx";

const CHOICE_INPUTS = "li input[type=radio], li input[type=checkbox], li textarea";

// Element 上没有 click（lib.dom 只给 HTMLElement），统一收口
function clickEl(el: Element | null | undefined): void {
  (el as HTMLElement | null)?.click();
}

// 首个 ul 内的作答控件（对照 ul:eq(0) li :radio,:checkbox,textarea）
function choiceInputs(html: Element): NodeListOf<Element> | null {
  const firstUl = html.querySelectorAll("ul")[0];
  return firstUl ? firstUl.querySelectorAll(CHOICE_INPUTS) : null;
}

// AI 回复清洗：去常见前缀（「正确答案：」「答案是」等）与尾部标点
function cleanAiText(item: string): string {
  return removeHtml(item)
    .replace(/^(正确答案|参考答案|答案是|答案为|答案|选)[:：是]?\s*/, "")
    .replace(/[。．、，,\s]+$/, "")
    .trim();
}

// 匹配归一化：页面选项常包一层引号（如“台湾属于中国”），AI 回复通常不带，
// 比对前双方统一剥掉引号与空白，避免纯包装符号导致失配
function normalizeForMatch(text: string): string {
  return text.replace(/[\s“”„‟‘’「」『』"']/g, "");
}

// 答案项与选项匹配得下标，逐级放宽：
// 1) 归一化后精确匹配（原版为原文精确匹配）；2) 单字母 A-G（可带分隔符）按下标映射；
// 3) 兜底「包含选项原文」，多命中取最长（AI 回复带修饰文字时用，≥2 字防误命中短选项）
export function matchAnswer(answer: string[], options: string[]): number[] {
  const matched: number[] = [];
  // 长度阈值与「取最长」都用归一化后的选项，防止剥掉包装引号后长短关系变化
  const normalizedOptions = options.map(normalizeForMatch);
  for (const item of answer) {
    const text = normalizeForMatch(cleanAiText(item));
    const letterMatch = text.match(/^([A-Ga-g])[.、．。:：]?$/);
    if (letterMatch) {
      const index = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
      if (index < options.length) matched.push(index);
      continue;
    }
    let exact = false;
    for (let j = 0; j < options.length; j++) {
      if (normalizedOptions[j].length > 0 && text === normalizedOptions[j]) {
        matched.push(j);
        exact = true;
      }
    }
    if (exact) continue;
    const candidates = normalizedOptions
      .map((option, j) => (option.length >= 2 && text.includes(option) ? j : -1))
      .filter((j) => j >= 0);
    if (candidates.length > 0) {
      matched.push(
        candidates.reduce((a, b) => (normalizedOptions[b].length > normalizedOptions[a].length ? b : a)),
      );
    }
  }
  return matched;
}

function clearEditors(html: Element, iframeWindow: Window): void {
  const ue = (iframeWindow as CxUEWindow).UE;
  if (!ue) return;
  for (const textarea of html.querySelectorAll<HTMLTextAreaElement>("textarea")) {
    const name = textarea.getAttribute("name");
    if (!name) continue;
    const editor = ue.getEditor(name);
    editor.ready(() => editor.setContent(""));
  }
}

// 取消当前已选：含选中标记的容器点击反选，radio/checkbox 置空，UEditor 清空
function clearCurrent(html: Element, iframeWindow: Window): void {
  for (const item of html.querySelectorAll(".answerBg, .textDIV, .eidtDiv")) {
    if (item.querySelector(".check_answer, .check_answer_dx")) clickEl(item);
  }
  for (const input of html.querySelectorAll<HTMLInputElement>("input[type=radio], input[type=checkbox]")) {
    input.checked = false;
  }
  clearEditors(html, iframeWindow);
}

// 按题型填涂；成功返回答案数组，失败返回 null
export function setAnswer(
  answer: string[],
  question: ParsedQuestion,
  html: Element,
  iframeWindow: Window,
): string[] | null {
  switch (question.type) {
    case "0":
    case "1": {
      const matched = matchAnswer(answer, question.options);
      if (matched.length === 0) return null;
      clearCurrent(html, iframeWindow);
      // 三路点击兼容不同皮肤（对照源码）：首个 ul 内输入控件 / .answerBg 容器 / li 本身
      const inputs = choiceInputs(html);
      for (const index of matched) {
        inputs?.[index]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        clickEl(html.querySelectorAll(".answerBg")[index]);
        clickEl(html.querySelectorAll("li")[index]);
      }
      return answer;
    }
    case "3": {
      clearCurrent(html, iframeWindow);
      // 判断同义词放宽：源码版按逗号定界（题库答案形状），AI 回复可能带「不」前缀与尾部标点，先清洗再判
      const raw = (answer[0] ?? "").trim();
      const negated = /^不/.test(raw);
      const verdict = raw.replace(/^不/, "").replace(/[。．、，,\s]+$/g, "");
      const truthy = /正确|是|对|√|true/i.test(verdict);
      const falsy = /错误|否|错|×|false/i.test(verdict);
      const isTrue = !negated && truthy && !falsy;
      const isFalse = negated ? truthy : falsy && !truthy;
      // radio 组：value "true" 的控件在答案为「正确」时点选，其余控件在答案为「错误」时点选
      const inputs = choiceInputs(html);
      if (inputs) {
        for (const input of inputs) {
          const value = (input as HTMLInputElement).value;
          if (value === "true" ? isTrue : isFalse) clickEl(input);
        }
      }
      // 皮肤变体：.answerBg 内 .num_option[data=true/false]
      for (const bg of html.querySelectorAll<HTMLElement>(".answerBg")) {
        const flag = bg.querySelector<HTMLElement>(".num_option")?.getAttribute("data");
        if (flag === "true" ? isTrue : isFalse) clickEl(bg);
      }
      let checked =
        Array.from(inputs ?? []).some((input) => (input as HTMLInputElement).checked) ||
        html.querySelector(".check_answer, .check_answer_dx") !== null;
      // 兜底：部分皮肤判断题与选择题同构（首个 ul 内 li .after 为判断选项，无 radio），
      // radio/answerBg 都没点中时按选项文本同义词点选（选项文案有 对/错、正确/错误 等变体）
      if (!checked) {
        const firstUl = html.querySelectorAll("ul")[0];
        for (const li of firstUl?.querySelectorAll("li") ?? []) {
          const label = removeHtml(li.querySelector(".after")?.innerHTML ?? "");
          const truthyOption = /正确|是|对|√|true/i.test(label);
          const falsyOption = /错误|否|错|×|false/i.test(label);
          if (isTrue ? truthyOption && !falsyOption : falsyOption && !truthyOption) {
            clickEl(li);
            checked = true;
            break;
          }
        }
      }
      return checked ? answer : null;
    }
    case "2":
    case "9":
    case "4":
    case "5":
    case "6":
    case "7": {
      const textareas = html.querySelectorAll("textarea");
      if (textareas.length !== answer.length) return null;
      clearCurrent(html, iframeWindow);
      const ue = (iframeWindow as CxUEWindow).UE;
      if (!ue) return null;
      textareas.forEach((textarea, index) => {
        const name = textarea.getAttribute("name");
        if (!name) return;
        const editor = ue.getEditor(name);
        editor.ready(() => editor.setContent(answer[index].replace(/第.空:/g, "")));
      });
      return answer;
    }
    default:
      return null;
  }
}

// AI 结果 → 填涂：过滤空答案后尝试填涂（对齐原版 fillAnswer 的过滤，AI 为唯一来源）
export function fillAnswer(
  result: AnswerResult,
  question: ParsedQuestion,
  html: Element,
  iframeWindow: Window,
): string[] | null {
  const answer = result.answer.filter((item) => item.length > 0 && item !== "略");
  if (answer.length === 0) return null;
  return setAnswer(answer, question, html, iframeWindow);
}
