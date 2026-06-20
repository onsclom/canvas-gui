import * as ui from "../ui";

const PAD = 20;
const ROW_H = 28;
const GAP = 10;
const BTN_W = 100;
const SLIDER_W = 200;

const state = {
  t: 0,
  speed: 1,
  paused: false,
  reverse: false,
};

export function tick(ctx: CanvasRenderingContext2D, dt: number) {
  if (!state.paused) state.t += dt * state.speed * (state.reverse ? -1 : 1);
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, w, h);

  const r = Math.min(w, h) * 0.25;
  const a = state.t * 0.001;
  ctx.fillStyle = "#4ade80";
  ctx.beginPath();
  ctx.arc(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r, 8, 0, Math.PI * 2);
  ctx.fill();

  ui.begin(ctx);
  const x = PAD;
  let y = PAD;

  ui.label(`fps ${(1000 / dt).toFixed(0)}`, x, y + ROW_H / 2);
  y += ROW_H + GAP;

  if (ui.button("pause", state.paused ? "Play" : "Pause", x, y, BTN_W, ROW_H)) {
    state.paused = !state.paused;
  }
  y += ROW_H + GAP;

  state.speed = ui.slider("speed", "Speed", state.speed, 0, 4, x, y, SLIDER_W, ROW_H);
  y += ROW_H + GAP;

  state.reverse = ui.toggle("reverse", "Reverse", state.reverse, x, y, BTN_W, ROW_H);
  y += ROW_H + GAP;

  if (ui.button("reset", "Reset", x, y, BTN_W, ROW_H)) state.t = 0;

  ui.end();
}
