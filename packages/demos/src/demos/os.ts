// A tiny desktop environment: wallpaper, desktop icons, a taskbar with a live
// clock, and draggable/closable app windows — a text editor, a JavaScript
// editor + runner, a pixel-paint app, and an about box. Stress-tests windows,
// textArea, scrolling, and custom interaction all at once.
import * as ui from "canvas-gui";

type App = "editor" | "js" | "paint" | "about";

const APPS: { id: App; name: string; icon: string }[] = [
  { id: "editor", name: "Editor", icon: "📝" },
  { id: "js", name: "JS Runner", icon: "⚡" },
  { id: "paint", name: "Paint", icon: "🎨" },
  { id: "about", name: "About", icon: "💠" },
];

const GRID = 16;
const PALETTE = ["#ef4444", "#f59e0b", "#facc15", "#4ade80", "#22d3ee", "#3b82f6", "#a855f7", "#ec4899", "#ffffff", "#000000"];

const state = {
  open: [] as App[],
  editorText: "Welcome to the editor.\n\nThis is a real textArea — type, select,\ncopy/paste, drag to select, all of it.",
  code: 'let sum = 0;\nfor (let i = 1; i <= 10; i++) sum += i;\nconsole.log("sum 1..10 =", sum);\nsum * 2;',
  output: [] as string[],
  pixels: new Array(GRID * GRID).fill("") as string[],
  brush: "#4ade80",
};

function runCode() {
  const logs: string[] = [];
  const fakeConsole = {
    log: (...a: unknown[]) => logs.push(a.map(fmt).join(" ")),
    error: (...a: unknown[]) => logs.push("✗ " + a.map(fmt).join(" ")),
  };
  try {
    const fn = new Function("console", state.code);
    const ret = fn(fakeConsole);
    if (ret !== undefined) logs.push("→ " + fmt(ret));
  } catch (e) {
    logs.push("✗ " + (e as Error).message);
  }
  state.output = logs.length ? logs : ["(no output)"];
}
function fmt(v: unknown): string {
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function tick(ctx: CanvasRenderingContext2D, _dt: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;

  // wallpaper
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#1e293b");
  g.addColorStop(1, "#0f172a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // desktop icons (top-left grid)
  ui.col({ x: 16, y: 64, gap: 14, align: "stretch" }, () => {
    for (const app of APPS) {
      if (
        ui.button(`${app.icon}  ${app.name}`, {
          id: `desk-${app.id}`,
          width: 120,
          height: 44,
          radius: 8,
          textAlign: "left",
          padding: { l: 12, r: 12, t: 0, b: 0 },
          bg: "rgba(255,255,255,0.06)",
          border: "rgba(255,255,255,0.08)",
          font: "13px system-ui, sans-serif",
        }).clicked
      ) {
        if (!state.open.includes(app.id)) state.open.push(app.id);
      }
    }
  });

  // app windows
  for (const app of state.open) {
    const meta = APPS.find((a) => a.id === app)!;
    const def = winDefaults(app);
    const c = ui.window(
      {
        id: `osw-${app}`,
        title: `${meta.icon}  ${meta.name}`,
        closable: true,
        defaultX: def.x,
        defaultY: def.y,
        defaultW: def.w,
        defaultH: def.h,
        minW: 240,
        minH: 160,
      },
      () => appBody(app),
    );
    if (c.closeClicked) state.open = state.open.filter((a) => a !== app);
  }

  // taskbar
  ui.row(
    {
      x: 0,
      y: h - 44,
      width: "grow",
      height: 44,
      bg: "rgba(2,6,23,0.92)",
      border: "rgba(255,255,255,0.08)",
      align: "center",
      padding: { l: 8, r: 12, t: 0, b: 0 },
      gap: 6,
    },
    () => {
      ui.withFont("bold 13px system-ui, sans-serif", () => {
        ui.withTextColor("#4ade80", () => ui.label("◆ canvasOS", { width: 96 }));
      });
      for (const app of APPS) {
        const isOpen = state.open.includes(app.id);
        if (
          ui.button(`${app.icon} ${app.name}`, {
            id: `task-${app.id}`,
            height: 30,
            radius: 6,
            bg: isOpen ? "rgba(74,222,128,0.18)" : "rgba(255,255,255,0.05)",
            border: isOpen ? "rgba(74,222,128,0.4)" : undefined,
            font: "12px system-ui, sans-serif",
          }).clicked
        ) {
          if (isOpen) state.open = state.open.filter((a) => a !== app.id);
          else if (!state.open.includes(app.id)) state.open.push(app.id);
        }
      }
      ui.spacer({ width: "grow" });
      ui.withTextColor("#cbd5e1", () => {
        ui.withFont("13px ui-monospace, monospace", () => {
          ui.label(new Date().toLocaleTimeString());
        });
      });
    },
  );
}

function winDefaults(app: App) {
  switch (app) {
    case "editor": return { x: 180, y: 90, w: 420, h: 300 };
    case "js": return { x: 320, y: 130, w: 460, h: 360 };
    case "paint": return { x: 260, y: 110, w: 380, h: 430 };
    case "about": return { x: 400, y: 160, w: 320, h: 220 };
  }
}

function appBody(app: App) {
  switch (app) {
    case "editor": return editorApp();
    case "js": return jsApp();
    case "paint": return paintApp();
    case "about": return aboutApp();
  }
}

function editorApp() {
  state.editorText = ui.textArea(state.editorText, {
    id: "os-editor-ta",
    width: "grow",
    height: "grow",
    font: "13px ui-monospace, monospace",
  }).value;
  ui.withTextColor("#9ca3af", () => {
    ui.withFont("11px ui-monospace, monospace", () => {
      ui.label(`${state.editorText.length} chars · ${state.editorText.split("\n").length} lines`);
    });
  });
}

function jsApp() {
  ui.withTextColor("#9ca3af", () => {
    ui.withFont("11px system-ui, sans-serif", () => {
      ui.label("Write JS; console.log + the last expression show below.");
    });
  });
  state.code = ui.textArea(state.code, {
    id: "os-js-code",
    width: "grow",
    height: 130,
    font: "12px ui-monospace, monospace",
    bg: "#06080d",
  }).value;
  ui.row({ width: "grow", gap: 8 }, () => {
    if (
      ui.button("▶ Run", {
        id: "os-js-run",
        width: 90,
        height: 30,
        radius: 6,
        bg: "accent",
        textColor: "#052e16",
      }).clicked
    ) {
      runCode();
    }
    ui.withTextColor("#9ca3af", () =>
      ui.withFont("11px system-ui, sans-serif", () => ui.label("output:")),
    );
  });
  ui.col(
    {
      id: "os-js-out",
      width: "grow",
      height: "grow",
      bg: "#06080d",
      border: "rgba(255,255,255,0.06)",
      radius: 5,
      padding: 8,
      gap: 2,
      scrollable: true,
      align: "stretch",
    },
    () => {
      ui.withFont("12px ui-monospace, monospace", () => {
        if (state.output.length === 0) {
          ui.withTextColor("#4b5563", () => ui.label("Run to see output."));
        } else {
          for (const line of state.output) {
            ui.withTextColor(line[0] === "✗" ? "#fca5a5" : "#a7f3d0", () => {
              ui.label(line || " ", { wrap: true, width: "grow" });
            });
          }
        }
      });
    },
  );
}

function paintApp() {
  // palette
  ui.row({ width: "grow", gap: 4, align: "center" }, () => {
    for (const col of PALETTE) {
      const sel = state.brush === col;
      if (
        ui.button("", {
          id: `os-pal-${col}`,
          width: 22,
          height: 22,
          radius: 5,
          bg: col,
          border: sel ? "#ffffff" : "rgba(255,255,255,0.15)",
        }).clicked
      ) {
        state.brush = col;
      }
    }
    ui.spacer({ width: "grow" });
    if (ui.button("Clear", { id: "os-paint-clear", height: 26, radius: 6 }).clicked) {
      state.pixels = new Array(GRID * GRID).fill("");
    }
  });
  // pixel grid — click or drag to paint
  ui.col({ width: "grow", height: "grow", gap: 1, align: "stretch" }, () => {
    for (let r = 0; r < GRID; r++) {
      ui.row({ width: "grow", height: "grow", gap: 1 }, () => {
        for (let cI = 0; cI < GRID; cI++) {
          const i = r * GRID + cI;
          const cell = ui.node({
            id: `os-px-${i}`,
            width: "grow",
            height: "grow",
            bg: state.pixels[i] || "#0b0f17",
            clickable: true,
          });
          if (cell.hovering && ui.mouse.leftClickDown) state.pixels[i] = state.brush;
        }
      });
    }
  });
}

function aboutApp() {
  ui.withFont("bold 18px system-ui, sans-serif", () => ui.label("canvasOS"));
  ui.withTextColor("#9ca3af", () => {
    ui.withFont("12px system-ui, sans-serif", () => {
      ui.label("A toy desktop built entirely with canvas-gui.", { wrap: true, width: "grow" });
      ui.label("Drag title bars, resize from the corner, close with ✕. Launch apps from the desktop or taskbar.", { wrap: true, width: "grow" });
    });
  });
  ui.spacer({ height: 4 });
  ui.withTextColor("#4ade80", () => {
    ui.withFont("13px ui-monospace, monospace", () => {
      ui.label(`${state.open.length} app${state.open.length === 1 ? "" : "s"} open`);
    });
  });
}
