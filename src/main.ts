import { createApp } from "vue";
import App from "./App.vue";
import panelCss from "./styles/panel.css?inline";
import { startEntryRouter } from "./tasks/entry-router";

const MARKER = "data-uhelper100-initialized";

// Shadow DOM 隔离：host → attachShadow → 注入 style → 挂 Vue；MARKER 防重复注入
function mount() {
  if (document.documentElement.hasAttribute(MARKER)) {
    return;
  }
  document.documentElement.setAttribute(MARKER, "0.1.0");

  const host = document.createElement("div");
  host.id = "uhelper100-root";
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = panelCss;
  shadow.append(style);

  (document.body ?? document.documentElement).append(host);
  // Vue 运行时支持挂到 ShadowRoot，仅类型声明未覆盖
  createApp(App).mount(shadow as unknown as Element);
}

mount();
// 面板挂载后启动章节路由（非章节页路径时内部直接返回）
startEntryRouter();
