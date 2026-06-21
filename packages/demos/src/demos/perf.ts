// Performance test bench. Dial up element count and toggle stressors, watch
// the live frame-time HUD (current + rolling max). Everything you see is built
// from scratch every frame — this is the worst case the library handles.
import * as ui from "canvas-gui";

const CARD_BG = "#1f2937";
const CHROME_BG = "#0b0f17";
const CARD_BORDER = "rgba(255,255,255,0.06)";
const MUTED = "#9ca3af";

const state = {
  count: 800,
  text: true,
  animate: true,
  nested: false,
  scroll: true,
};

// rolling window of recent frame times for a max-over-Ns readout
const samples: { t: number; ms: number }[] = [];
const WINDOW_MS = 3000;

function pushSample(ms: number, now: number) {
  samples.push({ t: now, ms });
  while (samples.length && now - samples[0]!.t > WINDOW_MS) samples.shift();
}
function maxOver(): number {
  let m = 0;
  for (const s of samples) if (s.ms > m) m = s.ms;
  return m;
}
function avgOver(): number {
  if (!samples.length) return 0;
  let sum = 0;
  for (const s of samples) sum += s.ms;
  return sum / samples.length;
}

export function tick(ctx: CanvasRenderingContext2D, _dt: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;
  ctx.fillStyle = "#030712";
  ctx.fillRect(0, 0, w, h);

  const now = performance.now();
  pushSample(ui.perf.frameMs, now);
  const t = now / 1000;

  // ── HUD (fixed at top) ──────────────────────────────────────────────
  ui.row(
    {
      x: 0,
      y: 50,
      width: "grow",
      padding: 12,
      gap: 16,
      bg: "rgba(11,15,23,0.92)",
      align: "center",
    },
    () => {
      stat("FPS", ui.perf.fps.toFixed(0), ui.perf.fps >= 55 ? "#4ade80" : ui.perf.fps >= 30 ? "#facc15" : "#ef4444");
      stat("frame", `${ui.perf.frameMs.toFixed(1)}ms`, frameColor(ui.perf.frameMs));
      stat("max 3s", `${maxOver().toFixed(1)}ms`, frameColor(maxOver()));
      stat("avg 3s", `${avgOver().toFixed(1)}ms`, "#e5e7eb");
      stat("elements", String(state.count), "#e5e7eb");
      ui.spacer({ width: "grow" });
      // budget bar: frame time vs the 16.7ms 60fps budget
      ui.col({ width: 220, gap: 4 }, () => {
        ui.withTextColor(MUTED, () =>
          ui.withFont("10px system-ui, sans-serif", () => ui.label("frame budget (16.7ms)")),
        );
        ui.node({
          width: "grow",
          height: 12,
          bg: "#0f172a",
          radius: 6,
          fillBar: Math.min(1, ui.perf.frameMs / 16.7),
        });
      });
    },
  );

  // ── controls ────────────────────────────────────────────────────────
  ui.col(
    { x: 0, y: 110, width: "grow", padding: { l: 12, r: 12, t: 6, b: 6 }, gap: 8, bg: "rgba(11,15,23,0.8)", align: "stretch" },
    () => {
      ui.row({ width: "grow", gap: 12, align: "center" }, () => {
        ui.withTextColor(MUTED, () => ui.label("count", { width: 50 }));
        state.count = Math.round(
          ui.slider("", state.count, 0, 6000, {
            id: "perf-count",
            width: "grow",
            height: 24,
            radius: 5,
            precision: 0,
            step: 50,
          }).value,
        );
      });
      ui.row({ width: "grow", gap: 8, align: "center" }, () => {
        state.text = ui.toggle("Text", state.text, { id: "perf-text", width: 110, height: 28, radius: 5 }).value;
        state.animate = ui.toggle("Animate", state.animate, { id: "perf-anim", width: 110, height: 28, radius: 5 }).value;
        state.nested = ui.toggle("Nested layout", state.nested, { id: "perf-nest", width: 130, height: 28, radius: 5 }).value;
        state.scroll = ui.toggle("Scrollable", state.scroll, { id: "perf-scroll", width: 120, height: 28, radius: 5 }).value;
        ui.spacer({ width: "grow" });
        ui.withTextColor(MUTED, () =>
          ui.withFont("11px system-ui, sans-serif", () =>
            ui.label("Drag count up until FPS drops to find the budget."),
          ),
        );
      });
    },
  );

  // ── the stress field ────────────────────────────────────────────────
  const container = (fn: () => void) =>
    state.scroll
      ? ui.col(
          {
            id: "perf-field",
            x: 0,
            y: 178,
            width: "grow",
            height: h - 178,
            padding: 10,
            gap: 6,
            scrollable: true,
            align: "stretch",
          },
          fn,
        )
      : ui.col(
          { x: 0, y: 178, width: "grow", height: h - 178, padding: 10, gap: 6, clip: true, align: "stretch" },
          fn,
        );

  container(() => {
    if (state.nested) {
      nestedField(t);
    } else {
      flatField(t, w);
    }
  });
}

// a wrapped flow of many small tiles (uses a fixed per-row count so layout is
// predictable and dense)
function flatField(t: number, w: number) {
  const perRow = Math.max(1, Math.floor((w - 24) / 56));
  const rows = Math.ceil(state.count / perRow);
  let i = 0;
  for (let r = 0; r < rows; r++) {
    ui.row({ width: "grow", gap: 6, height: state.text ? 30 : 18 }, () => {
      for (let c = 0; c < perRow && i < state.count; c++, i++) {
        tile(i, t);
      }
    });
  }
}

// deeply nested rows/cols to stress the layout solver
function nestedField(t: number) {
  let i = 0;
  const groups = Math.ceil(state.count / 16);
  for (let g = 0; g < groups; g++) {
    ui.row({ width: "grow", gap: 4 }, () => {
      for (let a = 0; a < 4; a++) {
        ui.col({ width: "grow", gap: 4 }, () => {
          for (let b = 0; b < 4 && i < state.count; b++, i++) {
            tile(i, t);
          }
        });
      }
    });
  }
}

function tile(i: number, t: number) {
  const hue = state.animate ? (i * 7 + t * 60) % 360 : (i * 7) % 360;
  const lift = state.animate ? 6 + 4 * Math.sin(t * 2 + i * 0.3) : 8;
  ui.node({
    width: "grow",
    height: "grow",
    bg: `hsl(${hue.toFixed(0)},60%,${(40 + lift).toFixed(0)}%)`,
    radius: 4,
    text: state.text ? String(i) : undefined,
    textColor: "rgba(0,0,0,0.6)",
    textAlign: "center",
    font: "10px ui-monospace, monospace",
  });
}

function stat(label: string, value: string, color: string) {
  ui.col({ gap: 1, width: 84 }, () => {
    ui.withTextColor(MUTED, () =>
      ui.withFont("10px system-ui, sans-serif", () => ui.label(label)),
    );
    ui.withTextColor(color, () =>
      ui.withFont("bold 18px ui-monospace, monospace", () => ui.label(value)),
    );
  });
}

function frameColor(ms: number): string {
  return ms <= 16.7 ? "#4ade80" : ms <= 33 ? "#facc15" : "#ef4444";
}
