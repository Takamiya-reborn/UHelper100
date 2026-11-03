// 防降速（后台保活）：浏览器对后台标签页做计时器密集节流（5 分钟后每分钟才醒一次），
// 挂机切走标签页后换章轮询、逐题 sleep 全部被拉慢。豁免条件之一是「正在出声的标签页」，
// 这里循环播放一段真实无声的音频（全零采样 + 低音量，人耳不可闻，Chrome 按播放状态
// 判定 audible，不分析内容）让标签页全程享受前台待遇。副作用：标签页上会出现小喇叭图标。
// 无法对抗 OS 级休眠/省电（合盖、系统 doze），那是进程挂起，网页侧无解。
let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;

// 构造 1 秒 8-bit PCM 静音 WAV：8-bit 是无符号编码，无声中点是 128（全 0 是负满幅，会有爆音）
function buildSilentWav(sampleRate = 8000): ArrayBuffer {
  const samples = sampleRate;
  const buffer = new ArrayBuffer(44 + samples);
  const view = new DataView(buffer);
  const writeStr = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // fmt 块长度
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // 单声道
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true); // 字节率 = 采样率 × 1 声道 × 1 字节
  view.setUint16(32, 1, true); // 块对齐
  view.setUint16(34, 8, true); // 位深
  writeStr(36, "data");
  view.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) view.setUint8(44 + i, 128);
  return buffer;
}

// 自动播放策略：面板开关的点击算用户激活，直接 play() 一般能过；
// 若是恢复持久化状态在启动时自动开启（无激活），会遭 NotAllowedError，
// 兜底挂一次性交互监听，用户随手一点即恢复
function play(): void {
  if (!audio) return;
  audio.play().catch(() => {
    window.addEventListener(
      "pointerdown",
      () => {
        audio?.play().catch(() => {});
      },
      { once: true },
    );
  });
}

export function startKeepAwake(): void {
  if (audio) return;
  audio = new Audio(URL.createObjectURL(new Blob([buildSilentWav()], { type: "audio/wav" })));
  objectUrl = audio.src;
  audio.loop = true;
  audio.volume = 0.01;
  play();
}

export function stopKeepAwake(): void {
  if (!audio) return;
  audio.pause();
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
  audio = null;
}
