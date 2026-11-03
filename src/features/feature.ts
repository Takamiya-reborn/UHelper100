// Feature 契约：UI 层只认这个接口；data/progress 供详情区展示，start/stop 生命周期
export interface Feature {
  id: string;
  name: string;
  description: string;
  data: Record<string, string>;
  progress?: number;
  // 缺省开启；有副作用或需要用户知情的功能默认关（如防降速会出现喇叭图标）
  defaultEnabled?: boolean;
  // 依赖 AI 配置：未配置接口时 UI 禁用开关并提示（自动答题类）
  requiresAi?: boolean;
  start(): void;
  stop(): void;
}
