// Generative art: an animated fractal tree drawn with raw canvas calls, with
// every parameter wired to a canvas-gui control panel. Shows custom drawing
// living happily next to the UI — the library owns the panel, you own the
// pixels in the rest of the frame.
import * as ui from "canvas-gui";

const MUTED = "#9ca3af";

const state = {
  depth: 10,
  spreadDeg: 24,
  ratio: 0.74,
  trunk: 120,
  thickness: 1.1,
  wind: 0.12,
  windSpeed: 1.2,
  leafHue: 110,
  threeWay: false,
  leaves: true,
  t: 0,
};

export function tick(ctx: CanvasRenderingContext2D, dtMs: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;
  state.t += dtMs / 1000;

  // sky gradient backdrop
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#0b1020");
  g.addColorStop(1, "#0a1f17");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // ── the tree (custom canvas drawing) ────────────────────────────────
  ctx.lineCap = "round";
  const spread = (state.spreadDeg * Math.PI) / 180;
  drawBranch(ctx, w / 2, h - 20, state.trunk, -Math.PI / 2, state.depth, spread);

  // ── control panel (canvas-gui) ──────────────────────────────────────
  ui.col(
    {
      x: 16,
      y: 66,
      width: 270,
      bg: "rgba(11,15,23,0.86)",
      border: "rgba(255,255,255,0.08)",
      radius: 10,
      padding: 14,
      gap: 8,
      align: "stretch",
    },
    () => {
      ui.withFont("bold 15px system-ui, sans-serif", () => ui.label("Generative tree"));
      ui.withTextColor(MUTED, () =>
        ui.withFont("11px system-ui, sans-serif", () =>
          ui.label("Tune the parameters; the tree sways in the wind.", { wrap: true, width: "grow" }),
        ),
      );
      ui.spacer({ height: 4 });
      slider("Depth", "depth", 3, 12, 0, 1);
      slider("Branch angle", "spreadDeg", 5, 70, 0);
      slider("Length ratio", "ratio", 0.5, 0.85, 2);
      slider("Trunk length", "trunk", 50, 200, 0);
      slider("Thickness", "thickness", 0.3, 2.5, 2);
      slider("Wind", "wind", 0, 0.5, 2);
      slider("Wind speed", "windSpeed", 0, 4, 1);
      slider("Leaf hue", "leafHue", 0, 360, 0);
      ui.row({ gap: 8, width: "grow" }, () => {
        state.threeWay = ui.toggle("3-way split", state.threeWay, { id: "tree-3", width: "grow", height: 28, radius: 6 }).value;
        state.leaves = ui.toggle("Leaves", state.leaves, { id: "tree-leaves", width: "grow", height: 28, radius: 6 }).value;
      });
    },
  );
}

function slider(label: string, key: keyof typeof state, min: number, max: number, precision: number, step?: number) {
  ui.row({ gap: 8, align: "center", width: "grow" }, () => {
    ui.withTextColor(MUTED, () => ui.withFont("11px system-ui, sans-serif", () => ui.label(label, { width: 92 })));
    (state[key] as number) = ui.slider("", state[key] as number, min, max, {
      id: `tree-${key}`,
      width: "grow",
      height: 22,
      radius: 5,
      precision,
      step,
    }).value;
  });
}

function drawBranch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  angle: number,
  depth: number,
  spread: number,
) {
  if (depth <= 0 || len < 1) {
    if (state.leaves) {
      const hue = (state.leafHue + (1 - len / state.trunk) * 30) % 360;
      ctx.fillStyle = `hsla(${hue},65%,55%,0.8)`;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  // wind sway grows toward the thinner outer branches
  const sway = Math.sin(state.t * state.windSpeed + depth * 0.6) * state.wind * (1 - depth / (state.depth + 1));
  const a = angle + sway;
  const x2 = x + Math.cos(a) * len;
  const y2 = y + Math.sin(a) * len;

  // bark → green as branches thin out
  const tBark = depth / state.depth;
  ctx.strokeStyle = `hsl(${(28 + (1 - tBark) * 70).toFixed(0)},${(40 + (1 - tBark) * 20).toFixed(0)}%,${(28 + (1 - tBark) * 18).toFixed(0)}%)`;
  ctx.lineWidth = Math.max(0.5, depth * state.thickness);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const nl = len * state.ratio;
  drawBranch(ctx, x2, y2, nl, a - spread, depth - 1, spread);
  drawBranch(ctx, x2, y2, nl, a + spread, depth - 1, spread);
  if (state.threeWay) drawBranch(ctx, x2, y2, nl, a, depth - 1, spread);
}
