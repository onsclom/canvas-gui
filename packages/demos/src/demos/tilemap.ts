// Tilemap / level editor — paint tiles on a grid under a pan/zoom camera, all
// drawn in one ui.canvas. Pick a tile, paint with drag (snapped to the grid),
// switch to the Hand tool to pan, wheel to zoom. Combines custom draw + camera
// + grid snapping.
import * as ui from "canvas-gui";

const TILE = 32;
const TILES = [
  { name: "Grass", color: "#4ade80" },
  { name: "Water", color: "#38bdf8" },
  { name: "Sand", color: "#fcd34d" },
  { name: "Stone", color: "#94a3b8" },
  { name: "Lava", color: "#f87171" },
  { name: "Tree", color: "#16a34a" },
];

const state = {
  map: new Map<string, number>(),
  tile: 0,
  tool: "Paint" as "Paint" | "Hand",
  cam: { x: 0, y: 0, zoom: 1 },
  pan: null as { camX: number; camY: number; sx: number; sy: number } | null,
};

// seed a little island
(function seed() {
  for (let y = -4; y <= 4; y++)
    for (let x = -6; x <= 6; x++) {
      const d = Math.hypot(x, y * 1.4);
      if (d < 6) state.map.set(`${x},${y}`, d < 2 ? 5 : d < 4 ? 0 : 2);
    }
})();

export function tick(ctx: CanvasRenderingContext2D, _dt: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;
  ctx.fillStyle = "#0a0e17";
  ctx.fillRect(0, 0, w, h);

  ui.row({ x: 0, y: 50, width: "grow", height: h - 50, gap: 0, align: "stretch" }, () => {
    palette();
    editor();
  });
}

function palette() {
  ui.col(
    { width: 200, height: "grow", bg: "#111827", border: "rgba(255,255,255,0.07)", padding: 14, gap: 12, align: "stretch" },
    () => {
      ui.text("Tilemap", "h2");
      ui.text("Tiles", "caption");
      for (let i = 0; i < TILES.length; i++) {
        const t = TILES[i]!;
        const sel = state.tool === "Paint" && state.tile === i;
        const c = ui.row(
          {
            id: `tm-tile-${i}`,
            width: "grow",
            height: 34,
            radius: 6,
            padding: { l: 6, r: 6 },
            gap: 10,
            align: "center",
            clickable: true,
            bg: sel ? "rgba(74,222,128,0.16)" : "rgba(255,255,255,0.03)",
            border: sel ? "rgba(74,222,128,0.5)" : undefined,
          },
          () => {
            ui.node({ width: 22, height: 22, radius: 4, bg: t.color });
            ui.label(t.name, { textColor: sel ? "#e5e7eb" : "#cbd5e1" });
          },
        );
        if (c.clicked) {
          state.tile = i;
          state.tool = "Paint";
        }
      }
      ui.spacer({ height: 4 });
      state.tool = ui.segmented(state.tool, ["Paint", "Hand"], { id: "tm-tool" }).value;
      ui.text("Hand pans · wheel zooms · drag to paint", "caption");
      ui.spacer({ height: 4 });
      if (ui.button("Clear map", { id: "tm-clear", width: "grow", height: 30, radius: 6 }).clicked) {
        state.map.clear();
      }
      ui.spacer({ width: "grow", height: 0 });
      ui.withTextColor("#9ca3af", () =>
        ui.withFont("12px ui-monospace, monospace", () => ui.label(`${state.map.size} tiles · ${(state.cam.zoom * 100) | 0}%`)),
      );
    },
  );
}

function editor() {
  const pad = ui.canvas(
    { id: "tm-pad", width: "grow", height: "grow", clickable: true, cursor: state.tool === "Hand" ? "grab" : "crosshair" },
    (c, r) => draw(c, r),
  );
  handle(pad.rect);
}

function s2w(r: ui.Rect, sx: number, sy: number) {
  const cam = state.cam;
  return { x: (sx - r.x - r.w / 2) / cam.zoom + cam.x, y: (sy - r.y - r.h / 2) / cam.zoom + cam.y };
}

function handle(r: ui.Rect) {
  const cam = state.cam;
  const mx = ui.mouseX();
  const my = ui.mouseY();
  const over = mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h;
  if (!over) return;

  if (ui.mouse.wheelDelta !== 0) {
    const before = s2w(r, mx, my);
    cam.zoom = Math.max(0.4, Math.min(3, cam.zoom * (ui.mouse.wheelDelta < 0 ? 1.1 : 1 / 1.1)));
    const after = s2w(r, mx, my);
    cam.x += before.x - after.x;
    cam.y += before.y - after.y;
  }

  const wpt = s2w(r, mx, my);
  const cx = Math.floor(wpt.x / TILE);
  const cy = Math.floor(wpt.y / TILE);

  if (state.tool === "Hand") {
    if (ui.mouse.justLeftClicked) state.pan = { camX: cam.x, camY: cam.y, sx: mx, sy: my };
    if (state.pan && ui.mouse.leftClickDown) {
      cam.x = state.pan.camX - (mx - state.pan.sx) / cam.zoom;
      cam.y = state.pan.camY - (my - state.pan.sy) / cam.zoom;
    }
    if (!ui.mouse.leftClickDown) state.pan = null;
  } else {
    // paint while pressed/dragging; right-button erases
    if (ui.mouse.leftClickDown) state.map.set(`${cx},${cy}`, state.tile);
    else if (ui.mouse.rightClickDown) state.map.delete(`${cx},${cy}`);
  }
}

function draw(c: CanvasRenderingContext2D, r: ui.Rect) {
  const cam = state.cam;
  c.save();
  c.translate(r.x + r.w / 2, r.y + r.h / 2);
  c.scale(cam.zoom, cam.zoom);
  c.translate(-cam.x, -cam.y);

  const tl = s2w(r, r.x, r.y);
  const br = s2w(r, r.x + r.w, r.y + r.h);

  // grid
  c.strokeStyle = "rgba(255,255,255,0.06)";
  c.lineWidth = 1 / cam.zoom;
  c.beginPath();
  for (let x = Math.floor(tl.x / TILE) * TILE; x < br.x; x += TILE) {
    c.moveTo(x, tl.y);
    c.lineTo(x, br.y);
  }
  for (let y = Math.floor(tl.y / TILE) * TILE; y < br.y; y += TILE) {
    c.moveTo(tl.x, y);
    c.lineTo(br.x, y);
  }
  c.stroke();

  // tiles
  for (const [key, ti] of state.map) {
    const [cx, cy] = key.split(",").map(Number) as [number, number];
    c.fillStyle = TILES[ti]!.color;
    c.fillRect(cx * TILE + 0.5, cy * TILE + 0.5, TILE - 1, TILE - 1);
  }

  // hover cell highlight (paint tool)
  const mx = ui.mouseX();
  const my = ui.mouseY();
  if (state.tool === "Paint" && mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h) {
    const wpt = s2w(r, mx, my);
    const cx = Math.floor(wpt.x / TILE);
    const cy = Math.floor(wpt.y / TILE);
    c.fillStyle = TILES[state.tile]!.color + "66";
    c.fillRect(cx * TILE, cy * TILE, TILE, TILE);
    c.strokeStyle = "#ffffff";
    c.lineWidth = 1.5 / cam.zoom;
    c.strokeRect(cx * TILE + 0.5, cy * TILE + 0.5, TILE - 1, TILE - 1);
  }

  // origin marker
  c.strokeStyle = "rgba(255,255,255,0.25)";
  c.lineWidth = 1 / cam.zoom;
  c.beginPath();
  c.moveTo(-6, 0);
  c.lineTo(6, 0);
  c.moveTo(0, -6);
  c.lineTo(0, 6);
  c.stroke();

  c.restore();
}
