import { ref, type Ref } from "vue";

export interface PanelPosition {
  left: number;
  top: number;
}

// 面板拖拽：未拖拽过返回 null（走 CSS 默认停靠位），Pointer Events 统一鼠标/触摸
export function useDraggable(
  handle: Ref<HTMLElement | null>,
  panel: Ref<HTMLElement | null>,
) {
  const position = ref<PanelPosition | null>(null);
  const dragging = ref(false);

  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;

  function onPointerDown(event: PointerEvent) {
    const target = panel.value;
    if (!target || event.button !== 0) {
      return;
    }
    // 头部交互控件上不接管：setPointerCapture 会吞掉后续 click，按钮点不到
    if (
      (event.target as HTMLElement | null)?.closest(
        "button, input, textarea, select, a",
      )
    ) {
      return;
    }
    const rect = target.getBoundingClientRect();
    originLeft = rect.left;
    originTop = rect.top;
    startX = event.clientX;
    startY = event.clientY;
    handle.value?.setPointerCapture(event.pointerId);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function onPointerMove(event: PointerEvent) {
    // 3px 阈值内不算拖拽，避免原地按住时轻微抖动就触发 dragging 态
    if (!dragging.value) {
      if (Math.hypot(event.clientX - startX, event.clientY - startY) < 3) {
        return;
      }
      dragging.value = true;
    }
    const maxX = Math.max(12, window.innerWidth - 72);
    const maxY = Math.max(12, window.innerHeight - 48);
    position.value = {
      left: Math.min(Math.max(12, originLeft + event.clientX - startX), maxX),
      top: Math.min(Math.max(12, originTop + event.clientY - startY), maxY),
    };
  }

  function onPointerUp(event: PointerEvent) {
    dragging.value = false;
    handle.value?.releasePointerCapture(event.pointerId);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }

  return { position, dragging, onPointerDown };
}
