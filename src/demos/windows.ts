import * as ui from "../ui";

const state = {
  count: 0,
  notes: ["First note", "Second note", "Third note"],
};

ui.onCommand((name) => {
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
  }
});

export function tick(ctx: CanvasRenderingContext2D, _dt: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;

  ctx.fillStyle = "#030712";
  ctx.fillRect(0, 0, w, h);

  // hint at the bottom of the canvas
  ui.col(
    {
      x: 0,
      y: 50,
      width: "grow",
      align: "center",
      padding: 16,
      gap: 4,
    },
    () => {
      ui.withFont("bold 18px system-ui, sans-serif", () => {
        ui.label("Floating windows");
      });
      ui.withTextColor("#9ca3af", () => {
        ui.withFont("12px system-ui, sans-serif", () => {
          ui.label(
            "Drag a title bar to move. Grab the ⇲ in the bottom-right corner to resize.",
          );
        });
      });
    },
  );

  ui.window(
    {
      id: "win-counter",
      title: "Counter",
      defaultX: 120,
      defaultY: 130,
      defaultW: 280,
      defaultH: 180,
    },
    () => {
      ui.withTextColor("#9ca3af", () => {
        ui.withFont("11px system-ui, sans-serif", () => {
          ui.label("Click the buttons to mutate state.");
        });
      });
      ui.row({ width: "grow", gap: 8, align: "center" }, () => {
        if (
          ui.button("−", {
            id: "win-dec",
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
            id: "win-inc",
            width: 40,
            height: 32,
            radius: 5,
            font: "bold 18px system-ui, sans-serif",
          }).clicked
        ) {
          ui.cmd("windows.inc");
        }
      });
    },
  );

  ui.window(
    {
      id: "win-notes",
      title: "Notes",
      defaultX: 460,
      defaultY: 180,
      defaultW: 320,
      defaultH: 260,
      minH: 180,
    },
    () => {
      ui.col(
        {
          id: "notes-scroll",
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
              () => {
                ui.label(state.notes[i]!);
              },
            );
          }
        },
      );
      if (
        ui.button("Add note", {
          id: "add-note",
          width: "grow",
          height: 30,
          radius: 5,
        }).clicked
      ) {
        ui.cmd("windows.add-note");
      }
    },
  );
}
