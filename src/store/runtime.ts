import { reactive } from "vue";

// 题目状态：primary=已匹配答案 danger=暂无答案 空串=正在检索（沿用 study 的约定）
export type QuestionStatus = "primary" | "danger" | "";

export interface TaskQuestion {
  question: string;
  answer: string[] | string | null;
  status: QuestionStatus;
  // 题目在宿主页面的 DOM（initRuntime 时登记），题号点击时滚动定位用
  el?: Element | null;
}

// 运行时任务状态：形状对齐 study 的 askStore.task，接自动化后由各模块写入
export const runtime = reactive({
  task: {
    name: "暂未加载",
    video: { status: false },
    work: { questionList: [] as TaskQuestion[], inx: 0 },
  },
  count: 0,
});

// 题号导航点击定位：改高亮并把页面里那道题滚进视野（对照原版 askStore.select）
// 题目 DOM 可能已随换章销毁或所属框架已卸载，滚动失败静默忽略
export function selectQuestion(index: number) {
  runtime.task.work.inx = index;
  try {
    runtime.task.work.questionList[index]?.el?.scrollIntoView({ block: "center" });
  } catch {
    // 元素所属文档已不可访问
  }
}
