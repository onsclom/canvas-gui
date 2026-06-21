export const keysDown = new Set<string>();
// edge-only (single press, no repeat) — for hotkeys like Tab / Space
export const keysJustPressed = new Set<string>();
// includes browser auto-repeat — for text-input character processing
export const keysTyped = new Set<string>();
export const keysJustReleased = new Set<string>();
export const mouse = {
  onCanvas: false,
  x: 0,
  y: 0,
  justLeftClicked: false,
  justLeftReleased: false,
  justRightClicked: false,
  justRightReleased: false,
  leftClickDown: false,
  rightClickDown: false,
  wheelDelta: 0,
  wheelDeltaX: 0,
  // "mouse" | "touch" | "pen" — lets the UI enable touch drag-to-scroll
  pointerType: "mouse" as string,
};

// a touch release keeps onCanvas true for the frame that records the click,
// then this defers clearing it (and parking the pointer off-canvas) until the
// next resetInput — otherwise the tap's click is dropped by the hit test.
let clearTouchNext = false;

export function resetInput() {
  mouse.justLeftClicked = false;
  mouse.justLeftReleased = false;
  mouse.justRightClicked = false;
  mouse.justRightReleased = false;
  mouse.wheelDelta = 0;
  mouse.wheelDeltaX = 0;
  if (clearTouchNext) {
    mouse.onCanvas = false;
    mouse.x = -9999;
    mouse.y = -9999;
    clearTouchNext = false;
  }
  keysJustPressed.clear();
  keysTyped.clear();
  keysJustReleased.clear();
}

export function registerInputListeners(canvas: HTMLCanvasElement) {
  // stop the browser from panning/zooming the page on touch — we handle
  // scrolling ourselves so the canvas owns all touch gestures
  canvas.style.touchAction = "none";

  canvas.addEventListener("pointerdown", (e) => {
    mouse.pointerType = e.pointerType || "mouse";
    // a touch starts "on canvas" the moment it lands (no hover/enter first)
    if (e.pointerType !== "mouse") mouse.onCanvas = true;
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    if (e.button === 0) {
      mouse.leftClickDown = true;
      mouse.justLeftClicked = true;
    } else if (e.button === 2) {
      mouse.rightClickDown = true;
      mouse.justRightClicked = true;
    }
  });

  const onUp = (e: PointerEvent) => {
    if (e.button === 0) {
      mouse.leftClickDown = false;
      mouse.justLeftReleased = true;
    } else if (e.button === 2) {
      mouse.rightClickDown = false;
      mouse.justRightReleased = true;
    }
    // touch has no lingering hover: clear onCanvas after this frame's click
    if (e.pointerType !== "mouse") clearTouchNext = true;
  };
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  canvas.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  canvas.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "mouse") mouse.onCanvas = true;
  });

  canvas.addEventListener("pointerleave", (e) => {
    // touch leave is handled via clearTouchNext after the click is recorded
    if (e.pointerType === "mouse") mouse.onCanvas = false;
  });

  canvas.addEventListener("wheel", (e) => {
    mouse.wheelDelta += e.deltaY;
    mouse.wheelDeltaX += e.deltaX;
  });

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  document.body.addEventListener("keydown", (e) => {
    if (e.metaKey || e.altKey) return;
    // stop the browser from acting on keys we use internally — Tab would
    // move focus into the URL bar, arrows + space scroll the page
    if (
      e.key === "Tab" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === " " ||
      e.key === "Backspace" ||
      (e.ctrlKey && (e.key === "a" || e.key === "A"))
    ) {
      e.preventDefault();
    }
    if (!keysDown.has(e.key)) keysJustPressed.add(e.key);
    // keysTyped includes auto-repeat — every keydown event lands here
    keysTyped.add(e.key);
    keysDown.add(e.key);
  });

  document.body.addEventListener("keyup", (e) => {
    keysDown.delete(e.key);
    keysJustReleased.add(e.key);
  });
}
