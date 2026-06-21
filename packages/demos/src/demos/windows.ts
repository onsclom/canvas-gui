import * as ui from "canvas-gui";

type Kind = "counter" | "notes" | "plain";
type Win = { id: string; title: string; kind: Kind; x: number; y: number };

const state = {
  count: 0,
  notes: ["First note", "Second note", "Third note"],
  windows: [
    { id: "win-counter", title: "Counter", kind: "counter", x: 120, y: 150 },
    { id: "win-notes", title: "Notes", kind: "notes", x: 460, y: 200 },
  ] as Win[],
  nextId: 1,
};

ui.onCommand((name, args) => {
  switch (name) {
    case "windows.inc":
      state.count++;
      break;
    case "windows.dec":
      state.count--;
      break;
    case "windows.add-note":
      state.notes.push(`Note #${state.notes.length + 1}`);
      break;
    case "windows.spawn": {
      const n = state.nextId++;
      // cascade new windows so they don't all stack on the same spot
      const off = (state.windows.length % 8) * 28;
      state.windows.push({
        id: `win-spawn-${n}`,
        title: `Window ${n}`,
        kind: "plain",
        x: 180 + off,
        y: 140 + off,
      });
      break;
    }
    case "windows.close":
      state.windows = state.windows.filter((w) => w.id !== args!["id"]);
      break;
  }
});

export function tick(ctx: CanvasRenderingContext2D, _dt: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;

  ctx.fillStyle = "#030712";
  ctx.fillRect(0, 0, w, h);

  // toolbar
  ui.row(
    {
      x: 0,
      y: 50,
      width: "grow",
      align: "center",
      padding: 12,
      gap: 12,
      bg: "rgba(11,15,23,0.85)",
    },
    () => {
      ui.withFont("bold 16px system-ui, sans-serif", () => {
        ui.label("Floating windows");
      });
      if (
        ui.button("+ New window", {
          id: "win-new",
          radius: 6,
          height: 30,
          bg: "accent",
          textColor: "#052e16",
        }).clicked
      ) {
        ui.cmd("windows.spawn");
      }
      ui.spacer({ width: "grow" });
      ui.withTextColor("#9ca3af", () => {
        ui.withFont("12px system-ui, sans-serif", () => {
          ui.label(
            `${state.windows.length} open · drag the title bar, resize via ⇲, close via ✕`,
          );
        });
      });
    },
  );

  if (state.windows.length === 0) {
    ui.col(
      { x: 0, y: 120, width: "grow", align: "center", padding: 40 },
      () => {
        ui.withTextColor("#4b5563", () => {
          ui.withFont("14px system-ui, sans-serif", () => {
            ui.label("No windows — spawn one with + New window.");
          });
        });
      },
    );
  }

  for (const win of state.windows) {
    const c = ui.window(
      {
        id: win.id,
        title: win.title,
        closable: true,
        defaultX: win.x,
        defaultY: win.y,
        defaultW: win.kind === "notes" ? 320 : 280,
        defaultH: win.kind === "notes" ? 260 : 180,
        minH: win.kind === "notes" ? 180 : 120,
      },
      () => renderWindowBody(win),
    );
    if (c.closeClicked) ui.cmd("windows.close", { id: win.id });
  }
}

function renderWindowBody(win: Win) {
  if (win.kind === "counter") return counterBody(win.id);
  if (win.kind === "notes") return notesBody(win.id);
  return plainBody();
}

function counterBody(wid: string) {
  ui.withTextColor("#9ca3af", () => {
    ui.withFont("11px system-ui, sans-serif", () => {
      ui.label("Shared state — every Counter window reads the same value.");
    });
  });
  ui.row({ width: "grow", gap: 8, align: "center" }, () => {
    if (
      ui.button("−", {
        id: `${wid}-dec`,
        width: 40,
        height: 32,
        radius: 5,
        font: "bold 18px system-ui, sans-serif",
      }).clicked
    ) {
      ui.cmd("windows.dec");
    }
    ui.col({ width: "grow", align: "center" }, () => {
      ui.withFont("bold 28px ui-monospace, monospace", () => {
        ui.label(state.count.toString());
      });
    });
    if (
      ui.button("+", {
        id: `${wid}-inc`,
        width: 40,
        height: 32,
        radius: 5,
        font: "bold 18px system-ui, sans-serif",
      }).clicked
    ) {
      ui.cmd("windows.inc");
    }
  });
}

function notesBody(wid: string) {
  ui.col(
    {
      id: `${wid}-scroll`,
      width: "grow",
      height: "grow",
      padding: 6,
      gap: 4,
      bg: "#0b0f17",
      border: "rgba(255,255,255,0.06)",
      radius: 5,
      scrollable: true,
      align: "stretch",
    },
    () => {
      for (let i = 0; i < state.notes.length; i++) {
        ui.row(
          {
            width: "grow",
            padding: 6,
            bg: i % 2 === 0 ? "rgba(255,255,255,0.02)" : undefined,
            radius: 4,
            align: "center",
          },
          () => ui.label(state.notes[i]!),
        );
      }
    },
  );
  if (
    ui.button("Add note", {
      id: `${wid}-add`,
      width: "grow",
      height: 30,
      radius: 5,
    }).clicked
  ) {
    ui.cmd("windows.add-note");
  }
}

function plainBody() {
  ui.withTextColor("#9ca3af", () => {
    ui.withFont("12px system-ui, sans-serif", () => {
      ui.label(
        "A spawned window. Move it, resize it, close it with the ✕. Spawn as many as you like.",
        { wrap: true, width: "grow" },
      );
    });
  });
}
