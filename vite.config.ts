import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import monkey from 'vite-plugin-monkey';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // 依赖预打包缓存统一放到根目录 .tmp（gitignored），不在 node_modules 里留痕
  cacheDir: '.tmp/.vite',
  resolve: {
    alias: [
      // typr-ts 依赖 text-encoding polyfill（连带 ~1MB GBK 码表），浏览器原生 API 已够用
      { find: 'text-encoding', replacement: fileURLToPath(new URL('./src/utils/text-encoding.ts', import.meta.url)) },
    ],
  },
  plugins: [
    vue(),
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'UHelper100',
        namespace: 'UHelper100',
        version: '0.2.2',
        author: 'Takamiya-reborn',
        description: '自动完成视频、章节测试、考试',
        icon: 'https://vitejs.dev/logo.svg',
        // 自动更新源：TM 会按此地址定期比对版本号，脚本更新后老用户自动收到
        // （发布到 GreasyFork 时 GF 会注入自己的更新地址，这两行会被覆盖，无需删）
        updateURL: 'https://raw.githubusercontent.com/Takamiya-reborn/UHelper100/main/dist/uhelper100.user.js',
        downloadURL: 'https://raw.githubusercontent.com/Takamiya-reborn/UHelper100/main/dist/uhelper100.user.js',
        // 对齐 study/metadata.user.js 的泛匹配：超星主站 + 各高校/图书馆镜像域名
        match: [
          '*://*.chaoxing.com/*',
          '*://*.edu.cn/*',
          '*://*.nbdlib.cn/*',
          '*://*.hnsyu.net/*',
          '*://*.gdhkmooc.com/*',
        ],
        // 只在顶层窗口运行：章节页是多层 iframe 嵌套，不加会在每个框架里各挂一个面板；
        // 自动化逻辑经 contentWindow 伸入 iframe，无需在框架内运行
        noframes: true,
        // AI 接口地址用户可配：主流 OpenAI 兼容厂商域名进白名单（不弹授权框）。
        // 故意不加 @connect *：自定义中转站首次请求时 Tampermonkey 会弹一次授权框，
        // 这道确认是 key 的安全检查点（白名单请求静默放行，弹窗意味着请求流向了配置外的域名）
        connect: [
          'api.deepseek.com',
          'api.openai.com',
          'api.moonshot.cn',
          'dashscope.aliyuncs.com',
          'open.bigmodel.cn',
          'api.siliconflow.cn',
          'openrouter.ai',
          'api.mistral.ai',
          'api.x.ai',
          'api.anthropic.com',
          'generativelanguage.googleapis.com',
        ],
      },
      // 有意不配置 externalGlobals / externalResource：
      // Vue 打包进产物（tree-shake 后很小），@require 数量为零，
      // 脚本不依赖任何 CDN 可用性。
    }),
  ],
});
