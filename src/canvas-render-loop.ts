import { resetInput } from "./input";

const FIXED_FPS = 0;

let lastTime = performance.now();

export function startLoop(
  canvas: HTMLCanvasElement,
  tick: (ctx: CanvasRenderingContext2D, dt: number) => void,
) {
  if (FIXED_FPS) {
    setInterval(() => runTickStep(canvas, tick), 1000 / FIXED_FPS);
  } else {
    startRafLoop(canvas, tick);
  }
}

function startRafLoop(
  canvas: HTMLCanvasElement,
  tick: (ctx: CanvasRenderingContext2D, dt: number) => void,
) {
  runTickStep(canvas, tick);
  requestAnimationFrame(() => startRafLoop(canvas, tick));
}

function runTickStep(
  canvas: HTMLCanvasElement,
  tick: (ctx: CanvasRenderingContext2D, dt: number) => void,
) {
  const now = performance.now();
  const dt = now - lastTime;
  lastTime = now;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;

  const ctx = canvas.getContext("2d");
  assert(ctx);
  ctx.scale(devicePixelRatio, devicePixelRatio);

  tick(ctx, dt);
  resetInput();
}

function assert(condition: unknown): asserts condition {
  if (!condition) throw new Error("Assertion failed");
}
