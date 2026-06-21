// Physics playground — real UI widgets as physics bodies. They fall, bounce
// off the walls, collide with each other, scatter from the cursor, and they're
// still live buttons: click one and its counter ticks up. Unique to an
// immediate-mode lib where every widget is just data you position yourself.
import * as ui from "canvas-gui";

const CHROME_BG = "#0b0f17";
const MUTED = "#9ca3af";

type Body = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
  label: string;
  clicks: number;
};

const state = {
  bodies: [] as Body[],
  gravity: 900,
  bounce: 0.78,
  collide: true,
  repel: true,
  nextId: 1,
  seeded: false,
};

const WORDS = ["drag", "click", "bounce", "ui", "node", "row", "col", "fps", "wrap", "grow", "fit", "flex"];

function spawn(w: number, n = 1) {
  for (let i = 0; i < n; i++) {
    if (state.bodies.length >= 90) return;
    const label = WORDS[state.nextId % WORDS.length]!;
    const r = 22 + (state.nextId % 4) * 7;
    state.bodies.push({
      id: state.nextId++,
      x: 60 + ((state.nextId * 53) % Math.max(1, Math.floor(w - 120))),
      y: 200,
      vx: ((state.nextId * 37) % 200) - 100,
      vy: 0,
      r,
      hue: (state.nextId * 47) % 360,
      label,
      clicks: 0,
    });
  }
}

export function tick(ctx: CanvasRenderingContext2D, dtMs: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;
  ctx.fillStyle = "#05070d";
  ctx.fillRect(0, 0, w, h);

  const dt = Math.min(dtMs, 32) / 1000;
  const top = 150; // arena top (below the control bar)

  if (!state.seeded) {
    spawn(w, 14);
    state.seeded = true;
  }

  // ── physics step ────────────────────────────────────────────────────
  const mx = ui.mouseX();
  const my = ui.mouseY();
  for (const b of state.bodies) {
    b.vy += state.gravity * dt;
    // cursor repel
    if (state.repel) {
      const dx = b.x - mx;
      const dy = b.y - my;
      const d2 = dx * dx + dy * dy;
      const R = 130;
      if (d2 < R * R && d2 > 1) {
        const d = Math.sqrt(d2);
        const f = (1 - d / R) * 1800;
        b.vx += (dx / d) * f * dt;
        b.vy += (dy / d) * f * dt;
      }
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    // walls
    if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx) * state.bounce; }
    if (b.x + b.r > w) { b.x = w - b.r; b.vx = -Math.abs(b.vx) * state.bounce; }
    if (b.y - b.r < top) { b.y = top + b.r; b.vy = Math.abs(b.vy) * state.bounce; }
    if (b.y + b.r > h) {
      b.y = h - b.r;
      b.vy = -Math.abs(b.vy) * state.bounce;
      b.vx *= 0.98; // floor friction
    }
  }

  // ── body-body collisions (circle, impulse-resolved) ─────────────────
  if (state.collide) {
    for (let i = 0; i < state.bodies.length; i++) {
      for (let j = i + 1; j < state.bodies.length; j++) {
        const a = state.bodies[i]!;
        const c = state.bodies[j]!;
        const dx = c.x - a.x;
        const dy = c.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const overlap = a.r + c.r - dist;
        if (overlap > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          const push = overlap / 2;
          a.x -= nx * push; a.y -= ny * push;
          c.x += nx * push; c.y += ny * push;
          // exchange velocity along the normal (equal mass)
          const av = a.vx * nx + a.vy * ny;
          const cv = c.vx * nx + c.vy * ny;
          const diff = (cv - av) * state.bounce;
          a.vx += nx * diff; a.vy += ny * diff;
          c.vx -= nx * diff; c.vy -= ny * diff;
        }
      }
    }
  }

  // ── controls ────────────────────────────────────────────────────────
  ui.row(
    { x: 0, y: 50, width: "grow", padding: 12, gap: 14, bg: "rgba(11,15,23,0.9)", align: "center" },
    () => {
      ui.withFont("bold 15px system-ui, sans-serif", () => ui.label("Physics"));
      if (ui.button("Spawn ×5", { id: "phys-spawn", radius: 6, height: 30 }).clicked) spawn(w, 5);
      if (ui.button("Clear", { id: "phys-clear", radius: 6, height: 30 }).clicked) state.bodies.length = 0;
      ui.col({ width: 150, gap: 2 }, () => {
        ui.withTextColor(MUTED, () => ui.withFont("10px system-ui", () => ui.label("gravity")));
        state.gravity = ui.slider("", state.gravity, 0, 2500, { id: "phys-grav", width: "grow", height: 20, radius: 5, precision: 0 }).value;
      });
      ui.col({ width: 150, gap: 2 }, () => {
        ui.withTextColor(MUTED, () => ui.withFont("10px system-ui", () => ui.label("bounce")));
        state.bounce = ui.slider("", state.bounce, 0, 1, { id: "phys-bounce", width: "grow", height: 20, radius: 5, precision: 2 }).value;
      });
      state.collide = ui.toggle("Collisions", state.collide, { id: "phys-coll", radius: 6, height: 30, width: 120 }).value;
      state.repel = ui.toggle("Cursor repel", state.repel, { id: "phys-repel", radius: 6, height: 30, width: 130 }).value;
      ui.spacer({ width: "grow" });
      ui.withTextColor(MUTED, () => ui.withFont("11px system-ui", () => ui.label(`${state.bodies.length} bodies · move the cursor through them`)));
    },
  );

  // ── render bodies as live buttons ───────────────────────────────────
  for (const b of state.bodies) {
    const c = ui.button(`${b.label}${b.clicks ? " " + b.clicks : ""}`, {
      id: `phys-body-${b.id}`,
      x: b.x - b.r,
      y: b.y - b.r,
      width: b.r * 2,
      height: b.r * 2,
      radius: b.r,
      bg: `hsl(${b.hue},65%,52%)`,
      textColor: "rgba(0,0,0,0.7)",
      font: "bold 11px system-ui, sans-serif",
    });
    if (c.clicked) {
      b.clicks++;
      b.vy = -650; // pop up on click
      b.vx += (Math.random() - 0.5) * 200;
    }
  }
}
