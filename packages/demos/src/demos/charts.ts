// Live charts dashboard — every chart is drawn with ui.canvas(), the custom
// canvas escape hatch. Line / area / bars / sparklines / donut, a live data
// feed, and a hover crosshair with a tooltip on the main chart.
import * as ui from "canvas-gui";

const CARD_BG = "#111827";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const MUTED = "#9ca3af";
const GRID = "rgba(255,255,255,0.06)";

type Series = { name: string; color: string; data: number[]; v: number };
const N = 80;

function mkSeries(name: string, color: string, base: number): Series {
  return { name, color, data: Array.from({ length: N }, () => base), v: base };
}

const state = {
  series: [
    mkSeries("Requests/s", "#4ade80", 60),
    mkSeries("Latency ms", "#60a5fa", 40),
    mkSeries("Errors/s", "#f87171", 8),
  ] as Series[],
  bars: [42, 67, 30, 88, 54, 73, 25, 61, 49, 80, 35, 58],
  donut: [
    { label: "cache", val: 48, color: "#4ade80" },
    { label: "db", val: 26, color: "#60a5fa" },
    { label: "api", val: 18, color: "#fbbf24" },
    { label: "other", val: 8, color: "#a78bfa" },
  ],
  paused: false,
  acc: 0,
};

export function tick(ctx: CanvasRenderingContext2D, dtMs: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;
  ctx.fillStyle = "#0a0e17";
  ctx.fillRect(0, 0, w, h);

  // advance the live feed every ~90ms (random walk, clamped)
  if (!state.paused) {
    state.acc += dtMs;
    while (state.acc > 90) {
      state.acc -= 90;
      for (const s of state.series) {
        s.v = clamp(s.v + (Math.random() - 0.5) * s.v * 0.25, 1, 100);
        s.data.push(s.v);
        if (s.data.length > N) s.data.shift();
      }
    }
  }

  ui.col(
    {
      id: "charts-scroll",
      x: 0,
      y: 50,
      width: "grow",
      height: "grow",
      padding: 16,
      gap: 14,
      align: "stretch",
      scrollable: true,
    },
    () => {
      ui.row({ width: "grow", align: "center", gap: 12 }, () => {
        ui.withFont("bold 22px system-ui, sans-serif", () => ui.label("Dashboard"));
        ui.spacer({ width: "grow" });
        state.paused = ui.toggle(state.paused ? "▶ Resume" : "⏸ Pause", state.paused, {
          id: "ch-pause",
          width: 120,
          height: 30,
          radius: 6,
        }).value;
      });

      // stat cards with sparklines
      ui.row({ width: "grow", gap: 14, align: "stretch" }, () => {
        for (const s of state.series) statCard(s);
      });

      // main line/area chart
      card("Throughput (last 80 samples)", "grow", 240, () => {
        ui.canvas({ id: "ch-line", width: "grow", height: "grow", clickable: true }, (c, r) => {
          drawGrid(c, r);
          for (const s of state.series) drawArea(c, r, s.data, s.color, 0, 100);
          // hover crosshair + tooltip
          const mx = ui.mouseX();
          const my = ui.mouseY();
          if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
            const i = Math.round(((mx - r.x) / r.w) * (N - 1));
            const x = r.x + (i / (N - 1)) * r.w;
            c.strokeStyle = "rgba(255,255,255,0.25)";
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(x, r.y);
            c.lineTo(x, r.y + r.h);
            c.stroke();
            let ty = r.y + 8;
            for (const s of state.series) {
              const val = s.data[i] ?? 0;
              const y = r.y + r.h - (val / 100) * r.h;
              c.fillStyle = s.color;
              c.beginPath();
              c.arc(x, y, 3, 0, Math.PI * 2);
              c.fill();
              c.font = "11px ui-monospace, monospace";
              c.textAlign = "left";
              const tx = Math.min(x + 8, r.x + r.w - 90);
              c.fillStyle = "rgba(0,0,0,0.6)";
              c.fillRect(tx, ty, 86, 16);
              c.fillStyle = s.color;
              c.fillText(`${s.name}: ${val.toFixed(0)}`, tx + 4, ty + 8);
              ty += 18;
            }
          }
        });
      });

      ui.row({ width: "grow", gap: 14, align: "stretch" }, () => {
        // bar chart
        card("Requests by region", "grow", 200, () => {
          ui.canvas({ id: "ch-bars", width: "grow", height: "grow" }, (c, r) => {
            drawGrid(c, r);
            drawBars(c, r, state.bars, "#60a5fa");
          });
        });
        // donut
        card("Backend mix", 240, 200, () => {
          ui.canvas({ id: "ch-donut", width: "grow", height: "grow" }, (c, r) => {
            drawDonut(c, r, state.donut);
          });
        });
      });

      ui.spacer({ height: 12 });
    },
  );
}

function statCard(s: Series) {
  ui.col(
    { width: "grow", padding: 14, gap: 6, bg: CARD_BG, border: CARD_BORDER, radius: 10, align: "stretch" },
    () => {
      ui.withTextColor(MUTED, () =>
        ui.withFont("11px system-ui, sans-serif", () => ui.label(s.name.toUpperCase())),
      );
      ui.row({ width: "grow", align: "end", gap: 8 }, () => {
        ui.withTextColor(s.color, () =>
          ui.withFont("bold 28px ui-monospace, monospace", () =>
            ui.label((s.data[s.data.length - 1] ?? 0).toFixed(0)),
          ),
        );
        ui.spacer({ width: "grow" });
        ui.canvas({ id: `spark-${s.name}`, width: 110, height: 36 }, (c, r) => {
          drawSparkline(c, r, s.data, s.color);
        });
      });
    },
  );
}

function card(title: string, width: ui.SizeSpec, height: number, body: () => void) {
  ui.col(
    { width, padding: 14, gap: 10, bg: CARD_BG, border: CARD_BORDER, radius: 10, align: "stretch", height: height + 56 },
    () => {
      ui.withTextColor(MUTED, () =>
        ui.withFont("bold 12px system-ui, sans-serif", () => ui.label(title)),
      );
      body();
    },
  );
}

// ── drawing helpers (all pure canvas) ───────────────────────────────
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function drawGrid(c: CanvasRenderingContext2D, r: ui.Rect) {
  c.strokeStyle = GRID;
  c.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = r.y + (i / 4) * r.h;
    c.beginPath();
    c.moveTo(r.x, y);
    c.lineTo(r.x + r.w, y);
    c.stroke();
  }
}
function pts(r: ui.Rect, data: number[], min: number, max: number) {
  return data.map((v, i) => ({
    x: r.x + (i / (data.length - 1)) * r.w,
    y: r.y + r.h - ((v - min) / (max - min)) * r.h,
  }));
}
function drawArea(c: CanvasRenderingContext2D, r: ui.Rect, data: number[], color: string, min: number, max: number) {
  const p = pts(r, data, min, max);
  const grad = c.createLinearGradient(0, r.y, 0, r.y + r.h);
  grad.addColorStop(0, color + "55");
  grad.addColorStop(1, color + "00");
  c.beginPath();
  c.moveTo(p[0]!.x, r.y + r.h);
  for (const q of p) c.lineTo(q.x, q.y);
  c.lineTo(p[p.length - 1]!.x, r.y + r.h);
  c.closePath();
  c.fillStyle = grad;
  c.fill();
  c.beginPath();
  p.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
  c.strokeStyle = color;
  c.lineWidth = 2;
  c.lineJoin = "round";
  c.stroke();
}
function drawSparkline(c: CanvasRenderingContext2D, r: ui.Rect, data: number[], color: string) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const p = pts(r, data, min, max === min ? max + 1 : max);
  c.beginPath();
  p.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
  c.strokeStyle = color;
  c.lineWidth = 1.5;
  c.lineJoin = "round";
  c.stroke();
  const last = p[p.length - 1]!;
  c.fillStyle = color;
  c.beginPath();
  c.arc(last.x, last.y, 2.5, 0, Math.PI * 2);
  c.fill();
}
function drawBars(c: CanvasRenderingContext2D, r: ui.Rect, data: number[], color: string) {
  const max = Math.max(...data, 1);
  const gap = 6;
  const bw = (r.w - gap * (data.length - 1)) / data.length;
  data.forEach((v, i) => {
    const bh = (v / max) * (r.h - 8);
    const x = r.x + i * (bw + gap);
    const y = r.y + r.h - bh;
    const hovered =
      ui.mouseX() >= x && ui.mouseX() <= x + bw && ui.mouseY() >= r.y && ui.mouseY() <= r.y + r.h;
    c.fillStyle = hovered ? "#93c5fd" : color;
    c.beginPath();
    c.roundRect(x, y, bw, bh, 3);
    c.fill();
  });
}
function drawDonut(
  c: CanvasRenderingContext2D,
  r: ui.Rect,
  segs: { label: string; val: number; color: string }[],
) {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const rad = Math.min(r.w, r.h) / 2 - 8;
  const total = segs.reduce((a, s) => a + s.val, 0);
  let ang = -Math.PI / 2;
  for (const s of segs) {
    const a2 = ang + (s.val / total) * Math.PI * 2;
    c.beginPath();
    c.moveTo(cx, cy);
    c.arc(cx, cy, rad, ang, a2);
    c.closePath();
    c.fillStyle = s.color;
    c.fill();
    ang = a2;
  }
  // hole
  c.fillStyle = CARD_BG;
  c.beginPath();
  c.arc(cx, cy, rad * 0.58, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#e5e7eb";
  c.font = "bold 16px ui-monospace, monospace";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(`${total}%`, cx, cy);
  c.textBaseline = "alphabetic";
}
