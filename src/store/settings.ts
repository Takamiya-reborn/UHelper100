import { useGmStorage } from "../composables/useGmStorage";

// 设置仓库（模块级单例）：配置项即数据模型，控件直接 v-model 绑定，GM 持久化
export type Theme = "dark" | "light" | "system";

// 常规项取自 study/config.js 的 defaultConfig（autoAnswer/autoVideo/autoJump 是行为开关，归 features 注册表）
// AI 解题配置：OpenAI 兼容接口（替代原题库方案，见 src/utils/ai.ts）
export interface Settings {
  theme: Theme;
  // 章节测验与考试的提交分开控制：考试交卷不可逆，默认粒度要够细
  autoSubmitChapter: boolean;
  autoSubmitExam: boolean;
  interval: number;
  answerInterval: number;
  // 作答率阈值（成功填涂题数 / 总题数），不是正确率：AI 答案无法先验正确性
  minAnswerRate: number;
  watchRate: number;
  aiBaseUrl: string;
  aiKey: string;
  aiModel: string;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  autoSubmitChapter: true,
  autoSubmitExam: true,
  interval: 3,
  answerInterval: 3,
  minAnswerRate: 0.8,
  watchRate: 1,
  aiBaseUrl: "",
  aiKey: "",
  aiModel: "",
};

const stored = useGmStorage<Settings>("uhelper100:settings", DEFAULT_SETTINGS);

// 旧版单一 autoSubmit 迁移为两个独立开关（考试切换 autoExam 已并入自动答题，无存档）
const legacy = stored.value as Settings & { autoSubmit?: boolean; minAccuracy?: number };
if (typeof legacy.autoSubmit === "boolean") {
  legacy.autoSubmitChapter = legacy.autoSubmit;
  legacy.autoSubmitExam = legacy.autoSubmit;
  delete legacy.autoSubmit;
}
// 旧字段名 minAccuracy 更名为 minAnswerRate（语义是作答率而非正确率）
if (typeof legacy.minAccuracy === "number") {
  if (typeof legacy.minAnswerRate !== "number") legacy.minAnswerRate = legacy.minAccuracy;
  delete legacy.minAccuracy;
}

// 旧版本存档缺字段时补默认值（deep watch 会把补全结果写回存储）
Object.assign(stored.value, { ...DEFAULT_SETTINGS, ...stored.value });

export const settings = stored;
