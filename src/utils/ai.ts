// AI 解题客户端：替代原题库方案（study/api/server-api.js 的 ServerApi 不迁移，本模块是唯一答案来源）
// OpenAI 兼容协议（POST {baseUrl}/chat/completions，Bearer 鉴权），DeepSeek/Kimi/通义/GLM/GPT 及中转站通吃
// 章节测验迁移后，getAnswers 直接调用 askAI，返回形状对齐 fillAnswer 的消费约定
import { GM_xmlhttpRequest } from "vite-plugin-monkey/dist/client";
import { settings } from "../store/settings";
import { recordUsage, type AiTokenUsage } from "../store/usage";

// 题目形状对齐 study/parser/question-parse.js 的 getQuestion 产物
// type 题型码："0"单选 "1"多选 "2"填空 "3"判断 "4"简答 "5"名词解释 "6"论述 "7"计算
export interface AiQuestion {
  question: string;
  options: string[];
  type: string;
}

// 返回形状对齐 fillAnswer 的消费约定：
// choice 题 answer 每项为选项原文（matchAnswer 精确匹配用）；
// 判断题 answer[0] 为「正确」/「错误」（命中 setAnswer 的同义词正则）；
// 填空/简答 answer 每项对应一空
export interface AnswerResult {
  form: "AI";
  answer: string[];
}

// AI 响应比题库慢，原版 10s 不够
const REQUEST_TIMEOUT = 30000;

const TYPE_NAMES: Record<string, string> = {
  "0": "单选题",
  "1": "多选题",
  "2": "填空题",
  "3": "判断题",
  "4": "简答题",
  "5": "名词解释",
  "6": "论述题",
  "7": "计算题",
};

// 按题型给出最短作答指令：省 token，只要求输出答案本身（多选/多空用 # 分隔）
const ANSWER_RULES: Record<string, string> = {
  "0": "只输出正确选项的原文，不要解释。",
  "1": "只输出所有正确选项的原文，用#分隔，不要解释。",
  "2": "只输出每空答案，用#分隔，不要解释。",
  "3": "只输出「正确」或「错误」。",
};
const DEFAULT_RULE = "只输出答案，不要解释。";

function buildPrompt({ question, options, type }: AiQuestion): string {
  const lines = [`${TYPE_NAMES[type] ?? "未知"}：${question}`];
  if (options.length > 0) {
    lines.push(options.map((option, i) => `${String.fromCharCode(65 + i)}.${option}`).join("\n"));
  }
  lines.push(ANSWER_RULES[type] ?? DEFAULT_RULE);
  return lines.join("\n");
}

// system 指令压住车轱辘话：比在 user 里反复叮嘱有效得多
const SYSTEM_PROMPT =
  "你是答题接口。只输出答案本身：不解释、不分析、不客套、不复述题目，禁止「答案是」等前缀。多空/多选用#分隔。";

// 输出清洗：客观题只保留第一行有效内容（模型偶发把分析写多行），再剥离承接话前缀
function cleanContent(text: string, type: string): string {
  let out = text.trim();
  if (type === "0" || type === "1" || type === "3") {
    out = out.split("\n").map((line) => line.trim()).find(Boolean) ?? out;
  }
  return out.replace(/^(好的[，,。:！!]|当然[，,。:！!]|答案是|答案为|正确答案[:：是为]?|答案[:：]?)\s*/, "");
}

// AI 配置是否齐备（面板据此禁用答题开关并提示）
export function isAiConfigured(): boolean {
  const { aiBaseUrl, aiKey, aiModel } = settings.value;
  return Boolean(aiBaseUrl && aiKey && aiModel);
}

function assertConfigured() {
  if (!isAiConfigured()) {
    throw new Error("请先在高级设置中配置 AI（接口地址 / API Key / 模型名）");
  }
}

// 底层请求：resolve 原始响应文本；非 2xx / 超时 / 网络错误一律 reject
function requestAI(body: unknown): Promise<string> {
  const { aiBaseUrl, aiKey } = settings.value;
  const url = `${aiBaseUrl.replace(/\/+$/, "")}/chat/completions`;
  // key 随 Authorization 头出站：http 明文信道上等于裸奔，至少要警告到位
  if (url.startsWith("http://")) {
    console.warn("[UHelper100] AI 接口地址使用 http://，API Key 将明文传输，建议改用 https");
  }

  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "POST",
      url,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiKey}`,
      },
      data: JSON.stringify(body),
      timeout: REQUEST_TIMEOUT,
      onload: (res) => {
        if (res.status < 200 || res.status >= 300) {
          reject(new Error(`接口返回 ${res.status}：${res.responseText.slice(0, 200)}`));
        } else {
          resolve(res.responseText);
        }
      },
      ontimeout: () => reject(new Error("AI 请求超时")),
      onerror: () => reject(new Error("AI 请求失败（网络或跨域授权问题）")),
    });
  });
}

// OpenAI 兼容响应里的 token 统计（部分厂商可能省略，按 0 处理）

// 请求 AI 并解析答案；失败（网络/配置/格式）一律 reject，由调用方决定降级策略
export async function askAI(question: AiQuestion): Promise<AnswerResult> {
  assertConfigured();
  const { aiModel } = settings.value;
  let text: string;
  try {
    text = await requestAI({
      model: aiModel,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildPrompt(question) },
      ],
      temperature: 0,
    });
  } catch (error) {
    recordUsage(false);
    throw error;
  }

  let data: { choices?: { message?: { content?: unknown } }[]; usage?: AiTokenUsage };
  try {
    data = JSON.parse(text);
  } catch {
    recordUsage(false);
    throw new Error(`响应不是有效 JSON：${text.slice(0, 120)}`);
  }
  const content: unknown = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    recordUsage(false, data.usage);
    throw new Error("AI 返回内容为空");
  }
  const answer = cleanContent(content, question.type)
    .split("#")
    .map((item) => item.trim())
    .filter(Boolean);
  if (answer.length === 0) {
    recordUsage(false, data.usage);
    throw new Error("AI 返回内容无法解析出答案");
  }
  recordUsage(true, data.usage);
  return { form: "AI", answer };
}

// 连通性测试：发最小请求（ping + max_tokens 1）验证配置，收到 2xx 即视为连通。
// 不校验响应内容——部分推理模型在 max_tokens: 1 时 content 为空，属正常
export function testAIConnection(): Promise<void> {
  assertConfigured();
  const { aiModel } = settings.value;
  return requestAI({
    model: aiModel,
    messages: [{ role: "user", content: "ping" }],
    max_tokens: 1,
  }).then(() => undefined);
}
