// Node graph editor — the whole graph (grid, bezier wires, nodes, ports) is
// drawn inside one ui.canvas with a camera transform, so pan + zoom scale
// everything. Drag nodes to move them, drag the background to pan, wheel to
// zoom toward the cursor, and drag from an output port to an input port to
// wire nodes together.
import * as ui from "canvas-gui";

type Port = { name: string };
type GNode = { id: number; x: number; y: number; w: number; title: string; color: string; ins: Port[]; outs: Port[] };
type Wire = { from: number; fromPort: number; to: number; toPort: number };

const HEADER = 26;
const ROW = 22;
const PAD = 8;

const state = {
  nodes: [
    { id: 1, x: -360, y: -120, w: 150, title: "Input", color: "#60a5fa", ins: [], outs: [{ name: "value" }, { name: "time" }] },
    { id: 2, x: -120, y: -160, w: 160, title: "Multiply", color: "#4ade80", ins: [{ name: "a" }, { name: "b" }], outs: [{ name: "out" }] },
    { id: 3, x: -120, y: 40, w: 160, title: "Sine", color: "#fbbf24", ins: [{ name: "x" }], outs: [{ name: "y" }] },
    { id: 4, x: 140, y: -60, w: 160, title: "Add", color: "#a78bfa", ins: [{ name: "a" }, { name: "b" }], outs: [{ name: "sum" }] },
    { id: 5, x: 380, y: -40, w: 150, title: "Output", color: "#f472b6", ins: [{ name: "color" }], outs: [] },
  ] as GNode[],
  wires: [
    { from: 1, fromPort: 0, to: 2, toPort: 0 },
    { from: 1, fromPort: 1, to: 3, toPort: 0 },
    { from: 2, fromPort: 0, to: 4, toPort: 0 },
    { from: 3, fromPort: 0, to: 4, toPort: 1 },
    { from: 4, fromPort: 0, to: 5, toPort: 0 },
  ] as Wire[],
  cam: { x: 0, y: 0, zoom: 1 },
  drag: null as
    | { mode: "node"; id: number; ox: number; oy: number }
    | { mode: "pan"; camX: number; camY: number; sx: number; sy: number }
    | { mode: "wire"; from: number; fromPort: number }
    | null,
};

function nodeH(n: GNode) {
  return HEADER + Math.max(n.ins.length, n.outs.length) * ROW + PAD;
}
function outPort(n: GNode, i: number) {
  return { x: n.x + n.w, y: n.y + HEADER + i * ROW + ROW / 2 };
}
function inPort(n: GNode, i: number) {
  return { x: n.x, y: n.y + HEADER + i * ROW + ROW / 2 };
}
function nodeById(id: number) {
  return state.nodes.find((n) => n.id === id)!;
}

export function tick(ctx: CanvasRenderingContext2D, _dt: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(0, 0, w, h);

  ui.row({ x: 14, y: 16, gap: 10, align: "center" }, () => {
    ui.text("Node graph", "h2");
    ui.text("drag nodes · drag bg to pan · wheel to zoom · drag output→input to wire", "caption");
  });

  const pad = ui.canvas(
    { id: "ng", x: 0, y: 48, width: w, height: h - 48, clickable: true, cursor: "grab" },
    (c, r) => draw(c, r),
  );

  handleInput(pad.rect);
}

function s2w(r: ui.Rect, sx: number, sy: number) {
  const cam = state.cam;
  return {
    x: (sx - r.x - r.w / 2) / cam.zoom + cam.x,
    y: (sy - r.y - r.h / 2) / cam.zoom + cam.y,
  };
}

function handleInput(r: ui.Rect) {
  const cam = state.cam;
  const mx = ui.mouseX();
  const my = ui.mouseY();
  const over = mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h;
  const wpt = s2w(r, mx, my);

  // zoom toward cursor
  if (over && ui.mouse.wheelDelta !== 0) {
    const before = s2w(r, mx, my);
    cam.zoom = Math.max(0.3, Math.min(2.5, cam.zoom * (ui.mouse.wheelDelta < 0 ? 1.1 : 1 / 1.1)));
    const after = s2w(r, mx, my);
    cam.x += before.x - after.x;
    cam.y += before.y - after.y;
  }

  // press: decide pan / node-drag / wire
  if (over && ui.mouse.justLeftClicked && !state.drag) {
    const port = portAt(wpt.x, wpt.y);
    if (port && port.kind === "out") {
      state.drag = { mode: "wire", from: port.node, fromPort: port.idx };
    } else {
      const n = topNodeAt(wpt.x, wpt.y);
      if (n) state.drag = { mode: "node", id: n.id, ox: wpt.x - n.x, oy: wpt.y - n.y };
      else state.drag = { mode: "pan", camX: cam.x, camY: cam.y, sx: mx, sy: my };
    }
  }

  // active drag
  if (state.drag && ui.mouse.leftClickDown) {
    if (state.drag.mode === "node") {
      const n = nodeById(state.drag.id);
      n.x = wpt.x - state.drag.ox;
      n.y = wpt.y - state.drag.oy;
    } else if (state.drag.mode === "pan") {
      cam.x = state.drag.camX - (mx - state.drag.sx) / cam.zoom;
      cam.y = state.drag.camY - (my - state.drag.sy) / cam.zoom;
    }
  }

  // release: finish a wire
  if (state.drag && ui.mouse.justLeftReleased) {
    if (state.drag.mode === "wire") {
      const tgt = portAt(wpt.x, wpt.y);
      if (tgt && tgt.kind === "in" && tgt.node !== state.drag.from) {
        // replace any existing wire into that input, then connect
        state.wires = state.wires.filter((wi) => !(wi.to === tgt.node && wi.toPort === tgt.idx));
        state.wires.push({ from: state.drag.from, fromPort: state.drag.fromPort, to: tgt.node, toPort: tgt.idx });
      }
    }
    state.drag = null;
  }
  if (!ui.mouse.leftClickDown) state.drag = null;
}

function topNodeAt(wx: number, wy: number): GNode | null {
  for (let i = state.nodes.length - 1; i >= 0; i--) {
    const n = state.nodes[i]!;
    if (wx >= n.x && wx <= n.x + n.w && wy >= n.y && wy <= n.y + nodeH(n)) return n;
  }
  return null;
}
function portAt(wx: number, wy: number): { node: number; idx: number; kind: "in" | "out" } | null {
  for (const n of state.nodes) {
    for (let i = 0; i < n.outs.length; i++) {
      const p = outPort(n, i);
      if (Math.hypot(wx - p.x, wy - p.y) < 10) return { node: n.id, idx: i, kind: "out" };
    }
    for (let i = 0; i < n.ins.length; i++) {
      const p = inPort(n, i);
      if (Math.hypot(wx - p.x, wy - p.y) < 10) return { node: n.id, idx: i, kind: "in" };
    }
  }
  return null;
}

function draw(c: CanvasRenderingContext2D, r: ui.Rect) {
  const cam = state.cam;
  c.save();
  c.translate(r.x + r.w / 2, r.y + r.h / 2);
  c.scale(cam.zoom, cam.zoom);
  c.translate(-cam.x, -cam.y);

  // grid
  const tl = s2w(r, r.x, r.y);
  const br = s2w(r, r.x + r.w, r.y + r.h);
  const step = 40;
  c.strokeStyle = "rgba(255,255,255,0.05)";
  c.lineWidth = 1 / cam.zoom;
  c.beginPath();
  for (let x = Math.floor(tl.x / step) * step; x < br.x; x += step) {
    c.moveTo(x, tl.y);
    c.lineTo(x, br.y);
  }
  for (let y = Math.floor(tl.y / step) * step; y < br.y; y += step) {
    c.moveTo(tl.x, y);
    c.lineTo(br.x, y);
  }
  c.stroke();

  // wires
  for (const wi of state.wires) {
    const a = outPort(nodeById(wi.from), wi.fromPort);
    const b = inPort(nodeById(wi.to), wi.toPort);
    bezier(c, a.x, a.y, b.x, b.y, "rgba(148,163,184,0.8)");
  }
  // wire being created
  if (state.drag && state.drag.mode === "wire") {
    const a = outPort(nodeById(state.drag.from), state.drag.fromPort);
    const m = s2w(r, ui.mouseX(), ui.mouseY());
    bezier(c, a.x, a.y, m.x, m.y, "#4ade80");
  }

  // nodes
  for (const n of state.nodes) {
    const hgt = nodeH(n);
    c.fillStyle = "#1f2937";
    c.strokeStyle = "rgba(255,255,255,0.12)";
    c.lineWidth = 1.5 / cam.zoom;
    roundRect(c, n.x, n.y, n.w, hgt, 8);
    c.fill();
    c.stroke();
    // header
    c.fillStyle = n.color;
    roundRectTop(c, n.x, n.y, n.w, HEADER, 8);
    c.fill();
    c.fillStyle = "#0b1020";
    c.font = "bold 13px system-ui, sans-serif";
    c.textBaseline = "middle";
    c.textAlign = "left";
    c.fillText(n.title, n.x + 10, n.y + HEADER / 2);
    // ports
    c.font = "11px system-ui, sans-serif";
    for (let i = 0; i < n.ins.length; i++) {
      const p = inPort(n, i);
      port(c, p.x, p.y, "#60a5fa");
      c.fillStyle = "#cbd5e1";
      c.textAlign = "left";
      c.fillText(n.ins[i]!.name, p.x + 8, p.y);
    }
    for (let i = 0; i < n.outs.length; i++) {
      const p = outPort(n, i);
      port(c, p.x, p.y, "#4ade80");
      c.fillStyle = "#cbd5e1";
      c.textAlign = "right";
      c.fillText(n.outs[i]!.name, p.x - 8, p.y);
    }
  }
  c.textBaseline = "alphabetic";
  c.restore();
}

function bezier(c: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, color: string) {
  const dx = Math.max(40, Math.abs(bx - ax) * 0.5);
  c.strokeStyle = color;
  c.lineWidth = 2 / state.cam.zoom;
  c.beginPath();
  c.moveTo(ax, ay);
  c.bezierCurveTo(ax + dx, ay, bx - dx, by, bx, by);
  c.stroke();
}
function port(c: CanvasRenderingContext2D, x: number, y: number, color: string) {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, 4, 0, Math.PI * 2);
  c.fill();
}
function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rad: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, rad);
}
function roundRectTop(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rad: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, [rad, rad, 0, 0]);
}
