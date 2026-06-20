import * as ui from "../ui";

const state = {
  t: 0,
  speed: 1,
  paused: false,
  reverse: false,
};

export function tick(ctx: CanvasRenderingContext2D, dt: number) {
  if (!state.paused) {
    state.t += dt * state.speed * (state.reverse ? -1 : 1);
  }
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

  ui.col(
    {
      x: 20,
      y: 60,
      width: 220,
      gap: 8,
      padding: 12,
      bg: "rgba(15,23,42,0.9)",
      border: "rgba(255,255,255,0.06)",
      radius: 8,
      align: "stretch",
    },
    () => {
      ui.label(`fps ${(1000 / dt).toFixed(0)}`);
      ui.label(`fps ${(1000 / dt).toFixed(0)}`);
      ui.label(`fps ${(1000 / dt).toFixed(0)}`);
      if (
        ui.button(state.paused ? "Play" : "Pause", {
          id: "pause",
          radius: 5,
        }).clicked
      ) {
        state.paused = !state.paused;
      }
      state.speed = ui.slider("Speed", state.speed, 0, 4, { radius: 5 }).value;
      state.reverse = ui.toggle("Reverse", state.reverse, { radius: 5 }).value;
      if (ui.button("Reset", { radius: 5 }).clicked) state.t = 0;
    },
  );
}
