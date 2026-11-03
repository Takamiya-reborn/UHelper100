# UHelper100

超星学习通（含高校镜像站）助手脚本：自动观看视频/音频、完成章节测验、作业与考试答题（AI 接口，用户自配）。

## 安装

**前提**：浏览器装有 [Tampermonkey](https://www.tampermonkey.net/) 扩展。
Chrome 120+ 需要先在 `chrome://extensions` → Tampermonkey → 详情里打开「允许用户脚本」（开发者模式）。

三个渠道任选其一，点击链接后 Tampermonkey 会自动弹出安装页：

| 渠道        | 链接                                                                                                            | 说明                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| GitHub 直装 | [uhelper100.user.js](https://raw.githubusercontent.com/Takamiya-reborn/UHelper100/main/dist/uhelper100.user.js) | 跟随 main 分支最新构建                                               |
| 国内镜像    | [cdn.jsdelivr.net 安装](https://cdn.jsdelivr.net/gh/Takamiya-reborn/UHelper100@main/dist/uhelper100.user.js)    | `raw.githubusercontent.com` 不可达时用这个，内容相同（缓存最长 12h） |
| GreasyFork  | 待发布                                                                                                          | 发布后此处放 GF 链接，GF 渠道的更新由 GF 托管                        |

安装后进入任意超星课程页面，屏幕左侧会出现悬浮球，点开面板 →「高级」页配置 AI 接口（OpenAI 兼容格式：接口地址 / API Key / 模型名）即可使用。

## 功能

- 视频/音频挂机（事件驱动完成判定，倍速 1-16 可调）
- 章节测验：题目解析 → 字体反混淆 → AI 解答 → 按题型填涂 → 按正确率决定提交/暂存
- 作业、考试（单题整页）同链路，考试支持自动切题与自动交卷（均可关）
- 面板：任务进度、题号导航、功能开关、用量统计；Shadow DOM 隔离 + 深浅主题
- 所有配置本地 GM 存储持久化，卸载脚本即清除

## 开发

```bash
npm run build   # 产出 dist/uhelper100.user.js（单文件，零 @require）
```

改代码后的循环：`npm run build` → Tampermonkey 里更新脚本（重新安装 dist 产物，存储会保留）→ 刷新目标页面。
改目标站点：[vite.config.ts](vite.config.ts) 里的 `match`。

目录结构：`src/tasks/` 是自动化流程（入口路由、答题、挂机、字体反混淆），`src/features/` 是功能开关注册表，`src/utils/` 是工具与平台类型，其余为面板 UI（Vue3 + Shadow DOM，手写控件，设计参考 [Bilibili-Evolved](https://github.com/the1812/Bilibili-Evolved)）。

## 声明

本项目仅供学习交流使用，请自行判断、评估是否使用，由此产生的一切后果自负。
