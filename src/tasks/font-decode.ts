// 字体反混淆（迁移自 study/utils/font-decode.js）：超星 .font-cxsecret 密文 → Typr 解析 CJK 字形
// → md5 指纹（后 8 位）查「指纹→真字」映射表（打包内联，无外部请求）→ 替换回真字
// 返回状态摘要（供面板错误信息展示）；解码失败只 warn 不阻塞答题
import { Typr, TyprU } from "typr-ts";
import md5 from "blueimp-md5";
import fontMap from "../assets/cx-font-map.json";

// CJK 统一表意文字区（对照原版 19968-40870 遍历范围）
const CJK_START = 19968;
const CJK_END = 40870;

// 收集同源框架树内所有 document（超星整站同源；跨层样式/密文元素可能不在题目所在层，
// 从传入窗口向上走到顶再整树向下扫描，跨域框架访问会抛异常，跳过即可）
function collectDocs(win: Window): Document[] {
  let top: Window = win;
  try {
    while (top.parent && top.parent !== top) top = top.parent;
  } catch {
    // 跨域父窗口不可达，就地扫描
  }
  const docs: Document[] = [];
  const visit = (win: Window) => {
    try {
      const doc = win.document;
      if (doc && !docs.includes(doc)) docs.push(doc);
      for (const iframe of doc.querySelectorAll("iframe")) {
        if (iframe.contentWindow) visit(iframe.contentWindow);
      }
    } catch {
      // 跨域框架不可达，跳过
    }
  };
  visit(top);
  return docs;
}

export function decode(iframeWindow: Window): string {
  const docs = collectDocs(iframeWindow);

  // 密文样式可能在任意一层框架：全树找包含 font-cxsecret 的 <style>
  let tipElement: HTMLStyleElement | null = null;
  for (const doc of docs) {
    const found = Array.from(doc.querySelectorAll("style")).find((style) =>
      style.textContent?.includes("font-cxsecret"),
    );
    if (found) {
      tipElement = found;
      break;
    }
  }
  if (!tipElement) {
    console.log("[UHelper100] 字体反混淆：全框架未找到 font-cxsecret 样式（本页无混淆）");
    return "未找到密文样式";
  }
  // base64 结束符兼容单/双引号（源码为单引号，新版页面样式可能改写）
  const fontMatch = tipElement.textContent?.match(/base64,([\w\W]+?)['"]/);
  if (!fontMatch) {
    console.warn("[UHelper100] 字体反混淆：样式里未提取到 base64 字体");
    return "样式未提取到字体";
  }

  let charMap: Record<number, string>;
  try {
    // typr-ts 1.1.5 的 parse 返回单个 font 对象（非数组，对照源码 typr_default.parse(fontData)）
    const font = Typr.parse(base64ToUint8Array(fontMatch[1]));
    if (!font) {
      console.warn("[UHelper100] 字体反混淆：Typr.parse 返回空");
      return "字体解析失败";
    }
    // 密体字形轮廓 → md5 后 8 位作指纹 → 查映射表得真字
    charMap = {};
    let glyphCount = 0;
    for (let code = CJK_START; code < CJK_END; code++) {
      const glyph = TyprU.codeToGlyph(font, code);
      if (!glyph) continue;
      glyphCount++;
      const path = TyprU.glyphToPath(font, glyph);
      const fingerprint = md5(JSON.stringify(path)).slice(24);
      const real = (fontMap as unknown as Record<string, unknown>)[fingerprint];
      if (typeof real === "number") charMap[code] = String.fromCharCode(real);
    }
    console.log(`[UHelper100] 字体反混淆：字形 ${glyphCount} 个，映射命中 ${Object.keys(charMap).length} 个`);
  } catch (error) {
    console.warn("[UHelper100] 字体反混淆失败，题干可能乱码", error);
    return `字体解析异常：${error instanceof Error ? error.message : String(error)}`;
  }
  const mapped = Object.keys(charMap).length;

  // 密文元素同样全树替换
  let replaced = 0;
  for (const doc of docs) {
    for (const element of doc.querySelectorAll<HTMLElement>(".font-cxsecret")) {
      let html = element.innerHTML;
      for (const [code, real] of Object.entries(charMap)) {
        html = html.replace(new RegExp(String.fromCharCode(Number(code)), "g"), real);
      }
      element.innerHTML = html;
      element.classList.remove("font-cxsecret");
      replaced++;
    }
  }
  if (replaced === 0) {
    console.warn("[UHelper100] 字体反混淆：映射就绪但全框架未找到 .font-cxsecret 密文元素");
    return `命中 ${mapped} 字形但未找到密文元素`;
  }
  return `命中 ${mapped} 字形，替换 ${replaced} 个元素`;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return array;
}
