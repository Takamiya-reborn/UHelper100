// 题目解析（迁移自 study/parser/question-parse.js，逻辑保持一致）
// 依赖学习通页面固定 class 约定：题干清洗结果即 AI 解题的输入
// 题型码约定："0"单选 "1"多选 "2"填空 "3"判断 "4"简答 "5"名词解释 "6"论述 "7"计算

export interface ParsedQuestion {
  question: string;
  options: string[];
  type: string;
}

// 去 HTML 标签 + 实体 + 压缩空白，保留 img/换行
export function removeHtml(html: string | null | undefined): string {
  if (html == null) return "";
  return html
    .replace(/<((?!img|sub|sup|br)[^>]+)>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<img.*?src="(.*?)".*?>/g, '<img src="$1"/>')
    .trim();
}

// 去题型前缀「【单选题】」和分值后缀「（2.0分）」
function cleanTitle(str: string): string {
  return str.replace(/^【.*?】\s*/, "").replace(/\s*（\d+\.\d+分）$/, "");
}

// 三种页面三套解析器（对照 getQuestion 的 kind "1"/"2"/"3"）
// kind "1"：章节测验 .TiMu 元素
export function parseChapterQuestion(el: Element): ParsedQuestion | null {
  const title = el.querySelector(".clearfix .fontLabel");
  const typeInput = el.querySelector<HTMLInputElement>("input[name^=answertype]");
  if (!title || !typeInput) return null;
  // 选项严格限定首个 ul（对照源码 querySelectorAll("ul")[0]，题干/解析区的其他 ul 不得混入）
  const optionUl = el.querySelectorAll("ul")[0];
  const options = optionUl
    ? Array.from(optionUl.querySelectorAll("li .after")).map((item) => removeHtml(item.innerHTML))
    : [];
  return {
    question: cleanTitle(removeHtml(title.innerHTML)),
    options,
    type: typeInput.value,
  };
}

// kind "2"：作业页 .questionLi 元素（题干在 .mark_name，截取 </span> 之后）
export function parseHomeworkQuestion(el: Element): ParsedQuestion | null {
  const title = el.querySelector(".mark_name");
  const typeInput = el.querySelector<HTMLInputElement>("input[name^=answertype]");
  if (!title || !typeInput) return null;
  const raw = title.innerHTML;
  const questionText = cleanTitle(removeHtml(raw.substring(raw.indexOf("</span>") + 7)));
  const options = Array.from(el.querySelectorAll(".answer_p")).map((item) => removeHtml(item.innerHTML));
  return { question: questionText, options, type: typeInput.value };
}

// kind "3"：考试页（单题整页，题干在 .mark_name.colorDeep，题型码在第二个 input[name^=type]）
export function parseExamQuestion(root: Document | Element): ParsedQuestion | null {
  const title = root.querySelector(".mark_name.colorDeep");
  const typeInput = root.querySelectorAll<HTMLInputElement>("input[name^=type]")[1];
  if (!title || !typeInput) return null;
  const raw = title.innerHTML;
  const questionText = cleanTitle(removeHtml(raw.substring(raw.indexOf("</span>") + 7)));
  const options = Array.from(root.querySelectorAll(".answer_p")).map((item) => removeHtml(item.innerHTML));
  return { question: questionText, options, type: typeInput.value };
}
