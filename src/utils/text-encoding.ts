// text-encoding 原生替身：typr-ts 依赖该 polyfill（连带打包 ~1MB GBK 码表），
// 浏览器原生已有 TextDecoder/TextEncoder，Vite alias 指到本文件
export class TextDecoder {
  decode(input?: ArrayBuffer | ArrayBufferView): string {
    return new globalThis.TextDecoder().decode(input);
  }
}

export class TextEncoder {
  encode(input: string): Uint8Array {
    return new globalThis.TextEncoder().encode(input);
  }
}
