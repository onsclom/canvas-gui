import { resetInput } from "./input";
import { frameStart as uiFrameStart, frameEnd as uiFrameEnd } from "./ui";

const FIXED_FPS = 0;

let lastTime = performance.now();

// Per-frame timing, updated each tick. `frameMs` is the wall-clock cost of the
// whole UI step (build + layout + draw); `deltaMs` is the time since the last
// frame (≈ frame budget); `fps` is derived from it. Read it from your tick to
// build performance HUDs. Values reflect the most recently completed frame.
export const perf = { frameMs: 0, deltaMs: 0, fps: 0 };

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

  const t0 = performance.now();
  uiFrameStart(ctx, dt);
  tick(ctx, dt);
  uiFrameEnd();
  resetInput();
  perf.frameMs = performance.now() - t0;
  perf.deltaMs = dt;
  perf.fps = dt > 0 ? 1000 / dt : 0;
}

function assert(condition: unknown): asserts condition {
  if (!condition) throw new Error("Assertion failed");
}
