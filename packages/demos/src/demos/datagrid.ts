// Data grid — 50,000 rows, virtualized (only the visible window is built each
// frame), with a sticky header, click-to-sort columns, and drag-to-resize
// column dividers. The "real software" stress test: layout + scroll + perf.
import * as ui from "canvas-gui";

type Row = { id: number; name: string; email: string; team: string; score: number; active: boolean };

const FIRST = ["Ada", "Lin", "Mateo", "Sora", "Ivan", "Noa", "Kai", "Mira", "Omar", "Eve", "Raj", "Yuki", "Cleo", "Bjorn", "Nia"];
const LAST = ["Lovelace", "Tan", "Reyes", "Kim", "Petrov", "Berg", "Cho", "Ono", "Khan", "Diaz", "Park", "Sato", "Frost", "Vega", "Hart"];
const TEAMS = ["Platform", "Growth", "Design", "Infra", "Data", "Mobile"];

function genRows(n: number): Row[] {
  const out: Row[] = [];
  for (let i = 0; i < n; i++) {
    const f = FIRST[(i * 7) % FIRST.length]!;
    const l = LAST[(i * 13) % LAST.length]!;
    out.push({
      id: i + 1,
      name: `${f} ${l}`,
      email: `${f.toLowerCase()}.${l.toLowerCase()}@acme.io`,
      team: TEAMS[(i * 3) % TEAMS.length]!,
      score: (i * 9301 + 49297) % 1000,
      active: (i * 5) % 3 !== 0,
    });
  }
  return out;
}

type ColKey = keyof Row;
type Col = { key: ColKey; label: string; w: number; align?: "left" | "center" };

const state = {
  rows: genRows(50000),
  cols: [
    { key: "id", label: "#", w: 70, align: "left" },
    { key: "name", label: "Name", w: 200 },
    { key: "email", label: "Email", w: 280 },
    { key: "team", label: "Team", w: 140 },
    { key: "score", label: "Score", w: 100, align: "center" },
    { key: "active", label: "Active", w: 90, align: "center" },
  ] as Col[],
  sortKey: "id" as ColKey,
  sortDir: 1,
  order: [] as number[],
  orderDirty: true,
  selected: -1,
  resizing: null as { col: number; startW: number } | null,
};

const ROW_H = 30;

function ensureOrder() {
  if (!state.orderDirty) return;
  const k = state.sortKey;
  const dir = state.sortDir;
  const idx = state.rows.map((_, i) => i);
  idx.sort((a, b) => {
    const va = state.rows[a]![k];
    const vb = state.rows[b]![k];
    return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
  });
  state.order = idx;
  state.orderDirty = false;
}

function sortBy(k: ColKey) {
  if (state.sortKey === k) state.sortDir *= -1;
  else {
    state.sortKey = k;
    state.sortDir = 1;
  }
  state.orderDirty = true;
}

export function tick(ctx: CanvasRenderingContext2D, dt: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;
  ctx.fillStyle = "#0a0e17";
  ctx.fillRect(0, 0, w, h);
  ensureOrder();

  const totalW = state.cols.reduce((a, c) => a + c.w, 0);
  const top = 56;
  const headerH = 34;
  const bodyH = h - top - headerH - 12;
  const n = state.order.length;

  ui.row({ x: 16, y: 18, gap: 12, align: "center" }, () => {
    ui.text("Data grid", "h2");
    ui.text(`${n.toLocaleString()} rows · virtualized · fps ${(1000 / dt).toFixed(0)}`, "caption");
  });

  ui.col(
    { x: 12, y: top, width: w - 24, height: headerH + bodyH, gap: 0, align: "start", clip: true },
    () => {
      header(totalW);
      body(totalW, bodyH, n);
    },
  );

  // resize grips overlaid at each column's right edge (absolute, on top)
  let gx = 12;
  for (let i = 0; i < state.cols.length; i++) {
    gx += state.cols[i]!.w;
    const grip = ui.node({
      id: `rsz-${state.cols[i]!.key}`,
      x: gx - 3,
      y: top,
      width: 6,
      height: headerH,
      clickable: true,
      cursor: "ew-resize",
    });
    if (grip.pressed) state.resizing = { col: i, startW: state.cols[i]!.w };
    if (state.resizing && state.resizing.col === i && grip.dragging) {
      state.cols[i]!.w = Math.max(50, state.resizing.startW + grip.dragDelta.x);
    }
  }
  if (!ui.mouse.leftClickDown) state.resizing = null;
}

function header(totalW: number) {
  ui.row(
    { width: totalW, height: 34, bg: "#1f2937", border: "rgba(255,255,255,0.08)" },
    () => {
      for (const col of state.cols) {
        const active = state.sortKey === col.key;
        const arrow = active ? (state.sortDir > 0 ? " ↑" : " ↓") : "";
        if (
          ui.button(col.label + arrow, {
            id: `gh-${col.key}`,
            width: col.w,
            height: 34,
            radius: 0,
            bg: "rgba(255,255,255,0)",
            textColor: active ? "#4ade80" : "#e5e7eb",
            textAlign: "left",
            font: "bold 12px system-ui, sans-serif",
            padding: { l: 10, r: 6, t: 0, b: 0 },
          }).clicked
        ) {
          sortBy(col.key);
        }
      }
    },
  );
}

function body(totalW: number, bodyH: number, n: number) {
  const sc = ui.scrollState("grid-body");
  const first = Math.max(0, Math.floor(sc.y / ROW_H) - 3);
  const visible = Math.ceil(bodyH / ROW_H) + 6;
  const last = Math.min(n, first + visible);

  ui.col(
    { id: "grid-body", width: totalW, height: bodyH, scrollable: true, align: "start" },
    () => {
      if (first > 0) ui.spacer({ width: totalW, height: first * ROW_H });
      for (let vi = first; vi < last; vi++) {
        const ri = state.order[vi]!;
        gridRow(state.rows[ri]!, ri, vi);
      }
      if (last < n) ui.spacer({ width: totalW, height: (n - last) * ROW_H });
    },
  );
}

function gridRow(r: Row, ri: number, vi: number) {
  const sel = state.selected === ri;
  const c = ui.row(
    {
      id: `gr-${ri}`,
      width: "fit",
      height: ROW_H,
      clickable: true,
      bg: sel ? "rgba(74,222,128,0.16)" : vi % 2 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0)",
    },
    () => {
      for (const col of state.cols) {
        let txt: string;
        if (col.key === "active") txt = r.active ? "● yes" : "○ no";
        else txt = String(r[col.key]);
        ui.node({
          width: col.w,
          height: ROW_H,
          text: txt,
          textColor: col.key === "active" ? (r.active ? "#4ade80" : "#6b7280") : "#cbd5e1",
          textAlign: col.align ?? "left",
          font: "12px ui-monospace, monospace",
          padding: { l: 10, r: 6, t: 0, b: 0 },
        });
      }
    },
  );
  if (c.clicked) state.selected = ri;
}
