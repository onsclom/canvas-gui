// Paint — real freehand drawing via ui.canvas, with layers, a color palette,
// brush size, brush/eraser tools, undo, and clear. Strokes are stored per
// layer (relative to the canvas) and re-rendered each frame.
import * as ui from "canvas-gui";

type Pt = { x: number; y: number };
type Stroke = { color: string; size: number; pts: Pt[] };
type Layer = { name: string; visible: boolean; strokes: Stroke[] };

const PAPER = "#0e1320";
const PALETTE = ["#f8fafc", "#f87171", "#fb923c", "#fbbf24", "#4ade80", "#22d3ee", "#60a5fa", "#a78bfa", "#f472b6", "#0e1320"];

const state = {
  layers: [
    { name: "Layer 1", visible: true, strokes: [] },
    { name: "Layer 2", visible: true, strokes: [] },
  ] as Layer[],
  active: 0,
  color: "#4ade80",
  size: 6,
  eraser: false,
  cur: null as Stroke | null, // stroke currently being drawn
  nextLayer: 3,
};

export function tick(ctx: CanvasRenderingContext2D, _dt: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;
  ctx.fillStyle = "#0a0e17";
  ctx.fillRect(0, 0, w, h);

  ui.row({ x: 0, y: 50, width: "grow", height: h - 50, gap: 0, align: "stretch" }, () => {
    toolbar();
    canvasArea();
  });
}

function toolbar() {
  ui.col(
    {
      width: 220,
      height: "grow",
      bg: "#111827",
      border: "rgba(255,255,255,0.07)",
      padding: 14,
      gap: 12,
      align: "stretch",
    },
    () => {
      ui.text("Paint", "h2");

      ui.text("Color", "caption");
      ui.grid(
        { cols: 5, gap: 6 },
        PALETTE.map((col) => () => {
          const sel = !state.eraser && state.color === col;
          const c = ui.button("", {
            id: `pal-${col}`,
            height: 28,
            radius: 5,
            bg: col,
            border: sel ? "#ffffff" : "rgba(255,255,255,0.15)",
          });
          if (c.clicked) {
            state.color = col;
            state.eraser = false;
          }
        }),
      );

      ui.text("Brush size", "caption");
      state.size = Math.round(
        ui.slider("", state.size, 1, 48, { id: "pa-size", width: "grow", height: 26, radius: 5, precision: 0 }).value,
      );
      // size preview
      ui.canvas({ width: "grow", height: 40 }, (c, r) => {
        c.fillStyle = state.eraser ? "#475569" : state.color;
        c.beginPath();
        c.arc(r.x + r.w / 2, r.y + r.h / 2, Math.max(1, state.size / 2), 0, Math.PI * 2);
        c.fill();
      });

      ui.row({ width: "grow", gap: 6 }, () => {
        state.eraser = ui.segmented(state.eraser ? "Eraser" : "Brush", ["Brush", "Eraser"], {
          id: "pa-tool",
          height: 30,
        }).value === "Eraser";
      });

      ui.row({ width: "grow", gap: 6 }, () => {
        if (ui.button("Undo", { id: "pa-undo", width: "grow", height: 30, radius: 6 }).clicked) {
          state.layers[state.active]!.strokes.pop();
        }
        if (ui.button("Clear", { id: "pa-clear", width: "grow", height: 30, radius: 6 }).clicked) {
          state.layers[state.active]!.strokes = [];
        }
      });

      divider();
      ui.row({ width: "grow", align: "center" }, () => {
        ui.text("Layers", "caption");
        ui.spacer({ width: "grow" });
        if (ui.button("+", { id: "pa-addlayer", width: 26, height: 24, radius: 5 }).clicked) {
          state.layers.push({ name: `Layer ${state.nextLayer++}`, visible: true, strokes: [] });
          state.active = state.layers.length - 1;
        }
      });
      // layers listed top-most first
      for (let i = state.layers.length - 1; i >= 0; i--) {
        const ly = state.layers[i]!;
        const sel = state.active === i;
        const c = ui.row(
          {
            id: `pa-layer-${i}`,
            width: "grow",
            height: 30,
            radius: 5,
            padding: { l: 6, r: 6 },
            gap: 8,
            align: "center",
            clickable: true,
            bg: sel ? "rgba(74,222,128,0.16)" : "rgba(255,255,255,0.03)",
          },
          () => {
            ly.visible = ui.checkbox("", ly.visible, { id: `pa-vis-${i}` }).value;
            ui.label(ly.name, { textColor: sel ? "#e5e7eb" : "#9ca3af" });
            ui.spacer({ width: "grow" });
            ui.withTextColor("#6b7280", () =>
              ui.withFont("10px ui-monospace, monospace", () => ui.label(String(ly.strokes.length))),
            );
          },
        );
        if (c.clicked) state.active = i;
      }
    },
  );
}

function canvasArea() {
  const pad = ui.canvas(
    { id: "paint-pad", width: "grow", height: "grow", clickable: true, cursor: "crosshair" },
    (c, r) => {
      c.fillStyle = PAPER;
      c.fillRect(r.x, r.y, r.w, r.h);
      c.lineCap = "round";
      c.lineJoin = "round";
      for (const ly of state.layers) {
        if (!ly.visible) continue;
        for (const st of ly.strokes) drawStroke(c, r, st);
      }
    },
  );

  // freehand input
  const px = ui.mouseX() - pad.rect.x;
  const py = ui.mouseY() - pad.rect.y;
  if (pad.pressed) {
    const st: Stroke = {
      color: state.eraser ? PAPER : state.color,
      size: state.size,
      pts: [{ x: px, y: py }],
    };
    state.layers[state.active]!.strokes.push(st);
    state.cur = st;
  } else if (pad.dragging && state.cur) {
    const last = state.cur.pts[state.cur.pts.length - 1]!;
    if (Math.hypot(px - last.x, py - last.y) > 1.2) state.cur.pts.push({ x: px, y: py });
  }
  if (!ui.mouse.leftClickDown) state.cur = null;
}

function drawStroke(c: CanvasRenderingContext2D, r: ui.Rect, st: Stroke) {
  c.strokeStyle = st.color;
  c.lineWidth = st.size;
  if (st.pts.length === 1) {
    c.fillStyle = st.color;
    c.beginPath();
    c.arc(r.x + st.pts[0]!.x, r.y + st.pts[0]!.y, st.size / 2, 0, Math.PI * 2);
    c.fill();
    return;
  }
  c.beginPath();
  st.pts.forEach((p, i) => {
    const x = r.x + p.x;
    const y = r.y + p.y;
    if (i) c.lineTo(x, y);
    else c.moveTo(x, y);
  });
  c.stroke();
}

function divider() {
  ui.node({ width: "grow", height: 1, bg: "rgba(255,255,255,0.07)" });
}
