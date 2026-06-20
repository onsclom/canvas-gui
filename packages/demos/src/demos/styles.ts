import * as ui from "canvas-gui";

const state = {
  brutalVol: 0.6,
  brutalOn: true,
  terminalVol: 0.3,
  terminalOn: false,
  pastelVol: 0.8,
  pastelOn: true,
  vaporVol: 0.4,
  vaporOn: false,
};

ui.onCommand((name) => {
  switch (name) {
    case "styles.brutal-toggle":
      state.brutalOn = !state.brutalOn;
      break;
    case "styles.terminal-toggle":
      state.terminalOn = !state.terminalOn;
      break;
    case "styles.pastel-toggle":
      state.pastelOn = !state.pastelOn;
      break;
    case "styles.vapor-toggle":
      state.vaporOn = !state.vaporOn;
      break;
  }
});

export function tick(ctx: CanvasRenderingContext2D, _dt: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;

  ctx.fillStyle = "#0a0a0f";
  ctx.fillRect(0, 0, w, h);

  ui.col(
    {
      id: "styles-scroll",
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
      ui.col({ width: "grow", align: "center", gap: 4 }, () => {
        ui.withFont("bold 24px system-ui, sans-serif", () => {
          ui.label("Style showcase");
        });
        ui.withTextColor("#9ca3af", () => {
          ui.withFont("13px system-ui, sans-serif", () => {
            ui.label(
              "Four cards, same widgets, totally different looks. Every styling prop is just data on the node.",
            );
          });
        });
      });

      ui.row({ width: "grow", gap: 16, align: "stretch" }, () => {
        ui.col({ width: "grow", gap: 16, align: "stretch" }, () => {
          brutalist();
          pastel();
        });
        ui.col({ width: "grow", gap: 16, align: "stretch" }, () => {
          terminal();
          vaporwave();
        });
      });

      ui.spacer({ height: 8 });
    },
  );
}

// ─── BRUTALIST ──────────────────────────────────────────────────────
function brutalist() {
  ui.col(
    {
      width: "grow",
      padding: 22,
      gap: 16,
      bg: "#fff200",
      border: "#000",
      radius: 0,
      align: "stretch",
    },
    () => {
      ui.withTextColor("#000", () => {
        ui.withFont(
          "bold 20px ui-monospace, Menlo, Consolas, monospace",
          () => {
            ui.label("// BRUTALIST.UI");
          },
        );
        ui.withFont("12px ui-monospace, monospace", () => {
          ui.label(
            "uncompromising. monospace. zero radius. hot text on hotter yellow.",
            { wrap: true, width: "grow" },
          );
        });
        ui.col({ width: "grow", gap: 10 }, () => {
          state.brutalVol = ui.slider(
            "GAIN",
            state.brutalVol,
            0,
            1,
            {
              id: "brut-vol",
              width: "grow",
              height: 36,
              radius: 0,
              bg: "#000",
              textColor: "#fff200",
              font: "bold 12px ui-monospace, monospace",
              precision: 2,
            },
          ).value;
          if (
            ui.toggle(
              state.brutalOn ? "[X] ENABLED" : "[ ] DISABLED",
              state.brutalOn,
              {
                id: "brut-on",
                width: "grow",
                height: 36,
                radius: 0,
                bg: state.brutalOn ? "#000" : "#fff200",
                textColor: state.brutalOn ? "#fff200" : "#000",
                border: "#000",
                font: "bold 13px ui-monospace, monospace",
              },
            ).clicked
          ) {
            ui.cmd("styles.brutal-toggle");
          }
          ui.row({ width: "grow", gap: 8 }, () => {
            ui.button("EXECUTE", {
              id: "brut-exec",
              width: "grow",
              height: 38,
              radius: 0,
              bg: "#000",
              textColor: "#fff200",
              border: "#000",
              font: "bold 13px ui-monospace, monospace",
            });
            ui.button("ABORT", {
              id: "brut-abort",
              width: "grow",
              height: 38,
              radius: 0,
              bg: "#ff0040",
              textColor: "#000",
              border: "#000",
              font: "bold 13px ui-monospace, monospace",
            });
          });
        });
      });
    },
  );
}

// ─── TERMINAL ───────────────────────────────────────────────────────
function terminal() {
  ui.col(
    {
      width: "grow",
      padding: 20,
      gap: 12,
      bg: "#000",
      border: "#16a34a",
      radius: 4,
      align: "stretch",
    },
    () => {
      ui.withTextColor("#22c55e", () => {
        ui.withFont(
          "bold 16px ui-monospace, Menlo, Consolas, monospace",
          () => {
            ui.label("$ ./terminal-ui");
          },
        );
        ui.withFont("12px ui-monospace, monospace", () => {
          ui.label("// emerald glow, dark void, every pixel earns its place.", {
            wrap: true,
            width: "grow",
          });
        });
        ui.col({ width: "grow", gap: 8 }, () => {
          state.terminalVol = ui.slider(
            "  bandwidth",
            state.terminalVol,
            0,
            1,
            {
              id: "term-vol",
              width: "grow",
              height: 32,
              radius: 2,
              bg: "#062013",
              textColor: "#22c55e",
              font: "12px ui-monospace, monospace",
              precision: 2,
            },
          ).value;
          if (
            ui.toggle(
              state.terminalOn ? "  daemon: up" : "  daemon: down",
              state.terminalOn,
              {
                id: "term-on",
                width: "grow",
                height: 32,
                radius: 2,
                bg: state.terminalOn ? "#062013" : "#000",
                textColor: state.terminalOn ? "#22c55e" : "#4b5563",
                border: "#16a34a",
                font: "12px ui-monospace, monospace",
                textAlign: "left",
              },
            ).clicked
          ) {
            ui.cmd("styles.terminal-toggle");
          }
          ui.row({ width: "grow", gap: 6 }, () => {
            ui.button("  ▶ run", {
              id: "term-run",
              width: "grow",
              height: 34,
              radius: 2,
              bg: "#062013",
              textColor: "#22c55e",
              border: "#16a34a",
              font: "12px ui-monospace, monospace",
              textAlign: "left",
            });
            ui.button("  ✕ exit", {
              id: "term-exit",
              width: "grow",
              height: 34,
              radius: 2,
              bg: "#000",
              textColor: "#22c55e",
              border: "#16a34a",
              font: "12px ui-monospace, monospace",
              textAlign: "left",
            });
          });
        });
      });
    },
  );
}

// ─── PASTEL ─────────────────────────────────────────────────────────
function pastel() {
  ui.col(
    {
      width: "grow",
      padding: 24,
      gap: 14,
      bg: "#fff7f3",
      border: "#f3d6cd",
      radius: 16,
      align: "stretch",
    },
    () => {
      ui.withTextColor("#3a2530", () => {
        ui.withFont("bold 18px system-ui, sans-serif", () => {
          ui.label("Soft & rounded");
        });
        ui.withTextColor("#a08988", () => {
          ui.withFont("13px system-ui, sans-serif", () => {
            ui.label("Generous radii, cream paper, blush accents.", {
              wrap: true,
              width: "grow",
            });
          });
        });
        ui.col({ width: "grow", gap: 10 }, () => {
          state.pastelVol = ui.slider(
            "Sweetness",
            state.pastelVol,
            0,
            1,
            {
              id: "pas-vol",
              width: "grow",
              height: 34,
              radius: 17,
              bg: "#fce4ec",
              textColor: "#3a2530",
              font: "13px system-ui, sans-serif",
              precision: 2,
            },
          ).value;
          if (
            ui.toggle(
              state.pastelOn ? "✨ Notifications on" : "Notifications off",
              state.pastelOn,
              {
                id: "pas-on",
                width: "grow",
                height: 34,
                radius: 17,
                bg: state.pastelOn ? "#ec407a" : "#fce4ec",
                textColor: state.pastelOn ? "#fff" : "#3a2530",
                font: "13px system-ui, sans-serif",
              },
            ).clicked
          ) {
            ui.cmd("styles.pastel-toggle");
          }
          ui.row({ width: "grow", gap: 10 }, () => {
            ui.button("Save", {
              id: "pas-save",
              width: "grow",
              height: 38,
              radius: 19,
              bg: "#ec407a",
              textColor: "#fff",
              font: "bold 14px system-ui, sans-serif",
            });
            ui.button("Discard", {
              id: "pas-disc",
              width: "grow",
              height: 38,
              radius: 19,
              bg: "#fce4ec",
              textColor: "#3a2530",
              font: "bold 14px system-ui, sans-serif",
            });
          });
        });
      });
    },
  );
}

// ─── VAPORWAVE ──────────────────────────────────────────────────────
function vaporwave() {
  ui.col(
    {
      width: "grow",
      padding: 22,
      gap: 14,
      bg: "#1a0838",
      border: "#ff2cd1",
      radius: 10,
      align: "stretch",
    },
    () => {
      ui.withTextColor("#00ffcc", () => {
        ui.withFont("bold 20px system-ui, sans-serif", () => {
          ui.label("ＮＥＯＮ ／ ／");
        });
      });
      ui.withTextColor("#ff9eff", () => {
        ui.withFont("12px system-ui, sans-serif", () => {
          ui.label("late night cassette futurism — pink, cyan, and ultraviolet.", {
            wrap: true,
            width: "grow",
          });
        });
      });
      ui.col({ width: "grow", gap: 10 }, () => {
        state.vaporVol = ui.slider("REVERB", state.vaporVol, 0, 1, {
          id: "vap-vol",
          width: "grow",
          height: 36,
          radius: 6,
          bg: "#0f0226",
          textColor: "#00ffcc",
          font: "bold 12px system-ui, sans-serif",
          precision: 2,
        }).value;
        if (
          ui.toggle(
            state.vaporOn ? "★ AUTOPLAY" : "AUTOPLAY",
            state.vaporOn,
            {
              id: "vap-on",
              width: "grow",
              height: 36,
              radius: 6,
              bg: state.vaporOn ? "#ff2cd1" : "#0f0226",
              textColor: state.vaporOn ? "#1a0838" : "#ff9eff",
              border: "#ff2cd1",
              font: "bold 13px system-ui, sans-serif",
            },
          ).clicked
        ) {
          ui.cmd("styles.vapor-toggle");
        }
        ui.row({ width: "grow", gap: 8 }, () => {
          ui.button("► PLAY", {
            id: "vap-play",
            width: "grow",
            height: 40,
            radius: 6,
            bg: "#00ffcc",
            textColor: "#1a0838",
            font: "bold 14px system-ui, sans-serif",
          });
          ui.button("✕ STOP", {
            id: "vap-stop",
            width: "grow",
            height: 40,
            radius: 6,
            bg: "transparent",
            border: "#00ffcc",
            textColor: "#00ffcc",
            font: "bold 14px system-ui, sans-serif",
          });
        });
      });
    },
  );
}
