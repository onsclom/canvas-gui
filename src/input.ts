export const keysDown = new Set<string>();
export const keysJustPressed = new Set<string>();
export const keysJustReleased = new Set<string>();
export const mouse = {
  onCanvas: false,
  x: 0,
  y: 0,
  justLeftClicked: false,
  justRightClicked: false,
  leftClickDown: false,
  rightClickDown: false,
  wheelDelta: 0,
};

export function resetInput() {
  mouse.justLeftClicked = false;
  mouse.justRightClicked = false;
  mouse.wheelDelta = 0;
  keysJustPressed.clear();
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
    if (e.button === 0) mouse.leftClickDown = false;
    else if (e.button === 2) mouse.rightClickDown = false;
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
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!keysDown.has(e.key)) keysJustPressed.add(e.key);
    keysDown.add(e.key);
  });

  document.body.addEventListener("keyup", (e) => {
    keysDown.delete(e.key);
    keysJustReleased.add(e.key);
  });
}
