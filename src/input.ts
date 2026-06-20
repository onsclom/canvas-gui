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
};

export function resetInput() {
  mouse.justLeftClicked = false;
  mouse.justLeftReleased = false;
  mouse.justRightClicked = false;
  mouse.justRightReleased = false;
  mouse.wheelDelta = 0;
  keysJustPressed.clear();
  keysTyped.clear();
  keysJustReleased.clear();
}

export function registerInputListeners(canvas: HTMLCanvasElement) {
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button === 0) {
      mouse.leftClickDown = true;
      mouse.justLeftClicked = true;
    } else if (e.button === 2) {
      mouse.rightClickDown = true;
      mouse.justRightClicked = true;
    }
  });

  canvas.addEventListener("pointerup", (e) => {
    if (e.button === 0) {
      mouse.leftClickDown = false;
      mouse.justLeftReleased = true;
    } else if (e.button === 2) {
      mouse.rightClickDown = false;
      mouse.justRightReleased = true;
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  canvas.addEventListener("pointerenter", () => {
    mouse.onCanvas = true;
  });

  canvas.addEventListener("pointerleave", () => {
    mouse.onCanvas = false;
  });

  canvas.addEventListener("wheel", (e) => {
    mouse.wheelDelta += e.deltaY;
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
