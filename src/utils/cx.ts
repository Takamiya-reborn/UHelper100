// 超星平台协议类型：脚本与页面（videojs 播放器、任务点接口）交互的形状约定
// 命名约定：Cx 前缀 = 超星（ChaoXing）页面注入的全局能力

// videojs 播放器：仅声明脚本用到的方法
export interface CxPlayer {
  muted(muted: boolean): void;
  playbackRate(rate: number): void;
  play(): Promise<void>;
  paused(): boolean;
  currentTime(): number;
  duration(): number;
  on(event: string, listener: () => void): void;
  off(event: string, listener: () => void): void;
}

// 任务点 iframe 的 window：videojs 工厂 + 任务点完成状态接口
export type CxWindow = Window & {
  videojs: (id: string) => CxPlayer;
  isUnFinishJob?: () => boolean;
};

// 顶层章节页 window：页面自带的任务点定位函数
export type CxTopWindow = Window & {
  scroll2Job?: () => void;
};

// UEditor 富文本编辑器（填空/主观题）：页面全局 UE.getEditor 按 textarea name 取实例
export interface CxEditor {
  ready(callback: () => void): void;
  setContent(content: string): void;
}

export type CxUEWindow = Window & {
  UE?: { getEditor(name: string): CxEditor };
};

// 作业/考试页 window：页面自带的提交与校验函数
export type CxWorkWindow = Window & {
  btnBlueSubmit?: () => void;
  noSubmit?: () => void;
  submitCheckTimes?: () => void;
};
