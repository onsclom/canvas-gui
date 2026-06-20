import * as ui from "../ui";

const TOP_OFFSET = 50;
const CARD_RADIUS = 8;
const CARD_BG = "#1f2937";
const CHROME_BG = "#0b0f17";
const CODE_BG = "#06080d";
const CARD_BORDER = "rgba(255,255,255,0.06)";
const MUTED = "#9ca3af";
const CODE_COLOR = "#cbd5e1";
const KEYWORD = "#7dd3fc";
const STRING = "#bef264";

const state = {
  clicks: 0,
  liked: false,
  notifications: true,
  volume: 0.5,
  brightness: 0.7,
  modalOpen: false,
  name: "",
  email: "",
};

let _canvasW = 0;

ui.onCommand((name) => {
  switch (name) {
    case "docs.click":
      state.clicks++;
      break;
    case "docs.reset-count":
      state.clicks = 0;
      break;
    case "docs.toggle-liked":
      state.liked = !state.liked;
      break;
    case "docs.toggle-notif":
      state.notifications = !state.notifications;
      break;
    case "docs.open-modal":
      state.modalOpen = true;
      break;
    case "docs.close-modal":
      state.modalOpen = false;
      break;
  }
});

// === helpers ===

function h1(text: string) {
  ui.withFont("bold 28px system-ui, sans-serif", () => {
    ui.label(text);
  });
}
function h2(text: string) {
  ui.withFont("bold 17px system-ui, sans-serif", () => {
    ui.label(text);
  });
}
function p(text: string) {
  ui.withTextColor(MUTED, () => {
    ui.withFont("13px system-ui, sans-serif", () => {
      ui.label(text, { wrap: true, width: "grow" });
    });
  });
}
function tag(text: string) {
  ui.withTextColor(MUTED, () => {
    ui.withFont("bold 10px system-ui, sans-serif", () => {
      ui.label(text.toUpperCase());
    });
  });
}

function codeBlock(lines: string[]) {
  ui.col(
    {
      width: "grow",
      padding: 14,
      gap: 2,
      bg: CODE_BG,
      border: CARD_BORDER,
      radius: 6,
      align: "stretch",
    },
    () => {
      ui.withFont("12px ui-monospace, Menlo, Consolas, monospace", () => {
        ui.withTextColor(CODE_COLOR, () => {
          for (const line of lines) ui.label(line || " ");
        });
      });
    },
  );
}

function demoBox(fn: () => void) {
  ui.col(
    {
      width: "grow",
      padding: 16,
      gap: 8,
      bg: CHROME_BG,
      border: CARD_BORDER,
      radius: 6,
      align: "stretch",
      justify: "center",
    },
    fn,
  );
}

function section(
  title: string,
  desc: string,
  code: string[],
  demo: () => void,
) {
  // stack code + demo vertically when there isn't enough horizontal room
  const narrow = _canvasW < 800;
  ui.col(
    {
      width: "grow",
      padding: 18,
      gap: 10,
      bg: CARD_BG,
      border: CARD_BORDER,
      radius: CARD_RADIUS,
      align: "stretch",
    },
    () => {
      h2(title);
      if (desc) p(desc);
      if (narrow) {
        ui.col({ width: "grow", gap: 10, align: "stretch" }, () => {
          codeBlock(code);
          demoBox(demo);
        });
      } else {
        ui.row({ width: "grow", gap: 12, align: "stretch" }, () => {
          codeBlock(code);
          demoBox(demo);
        });
      }
    },
  );
}

export function tick(ctx: CanvasRenderingContext2D, _dt: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;
  _canvasW = w;

  ctx.fillStyle = "#030712";
  ctx.fillRect(0, 0, w, h);

  ui.col(
    {
      id: "docs-scroll",
      x: 0,
      y: TOP_OFFSET,
      width: "grow",
      height: "grow",
      padding: 16,
      gap: 14,
      scrollable: true,
      align: "stretch",
    },
    () => {
      // ── hero ──────────────────────────────────────────────────────
      ui.col(
        {
          width: "grow",
          padding: 24,
          gap: 8,
          bg: CARD_BG,
          border: CARD_BORDER,
          radius: CARD_RADIUS,
          align: "stretch",
        },
        () => {
          h1("canvas-gui");
          ui.withTextColor(MUTED, () => {
            ui.withFont("14px system-ui, sans-serif", () => {
              ui.label(
                "An immediate-mode UI library for HTML canvas with flexbox-style layout.",
                { wrap: true, width: "grow" },
              );
              ui.label(
                "Every section below pairs the code on the left with a live example on the right.",
                { wrap: true, width: "grow" },
              );
            });
          });
        },
      );

      // ── Containers ───────────────────────────────────────────────
      tag("Layout");
      section(
        "row() and col()",
        "Containers take options and a callback that builds their children.",
        [
          "ui.row({ gap: 8, padding: 12 }, () => {",
          '  ui.button("One");',
          '  ui.button("Two");',
          '  ui.button("Three");',
          "});",
        ],
        () => {
          ui.row({ gap: 8, padding: 4 }, () => {
            ui.button("One", { id: "doc-c-1", radius: 5 });
            ui.button("Two", { id: "doc-c-2", radius: 5 });
            ui.button("Three", { id: "doc-c-3", radius: 5 });
          });
        },
      );

      section(
        "Sizing",
        'A number is fixed px, "fit" wraps the content (default), "grow" fills remaining space.',
        [
          'ui.row({ width: "grow", gap: 6 }, () => {',
          '  ui.button("60",   { width: 60 });',
          '  ui.button("fit");',
          '  ui.button("grow", { width: "grow" });',
          "});",
        ],
        () => {
          ui.row({ width: "grow", gap: 6 }, () => {
            ui.button("60", { id: "doc-sz-60", width: 60, radius: 5 });
            ui.button("fit", { id: "doc-sz-fit", radius: 5 });
            ui.button("grow", {
              id: "doc-sz-grow",
              width: "grow",
              radius: 5,
            });
          });
        },
      );

      section(
        "Justify",
        "Distribute children along the main axis. Each row below uses the same widgets, just a different mode.",
        [
          'ui.row({ justify: "between", width: "grow" }, () => {',
          '  ui.button("A");',
          '  ui.button("B");',
          '  ui.button("C");',
          "});",
        ],
        () => {
          for (const j of ["start", "center", "end", "between"] as const) {
            ui.row(
              {
                width: "grow",
                justify: j,
                padding: 4,
                bg: "#030712",
                radius: 4,
                gap: 4,
                align: "center",
              },
              () => {
                ui.withTextColor(MUTED, () => {
                  ui.withFont("11px ui-monospace, monospace", () => {
                    ui.label(j, { width: 58 });
                  });
                });
                ui.button("A", { id: `j-${j}-a`, radius: 4, width: 32 });
                ui.button("B", { id: `j-${j}-b`, radius: 4, width: 32 });
                ui.button("C", { id: `j-${j}-c`, radius: 4, width: 32 });
              },
            );
          }
        },
      );

      section(
        "Align",
        "Position children along the cross axis. stretch makes children fill the cross axis.",
        [
          'ui.col({ align: "center", height: 80 }, () => {',
          '  ui.label("centered");',
          '  ui.button("OK");',
          "});",
        ],
        () => {
          ui.row({ width: "grow", gap: 6, height: 84 }, () => {
            for (const a of ["start", "center", "end", "stretch"] as const) {
              ui.col(
                {
                  width: "grow",
                  height: "grow",
                  padding: 4,
                  bg: "#030712",
                  radius: 4,
                  gap: 4,
                  align: a,
                },
                () => {
                  ui.withTextColor(MUTED, () => {
                    ui.withFont("10px ui-monospace, monospace", () => {
                      ui.label(a);
                    });
                  });
                  ui.button("X", {
                    id: `a-${a}`,
                    radius: 4,
                    width: 30,
                    height: 24,
                  });
                },
              );
            }
          });
        },
      );

      // ── Visuals ──────────────────────────────────────────────────
      tag("Visuals");
      section(
        "Backgrounds",
        '"auto" uses the neutral hover palette, "accent" the green palette, or pass any CSS color string.',
        [
          'ui.button("Auto",   { bg: "auto" });   // default',
          'ui.button("Accent", { bg: "accent" });',
          'ui.button("Custom", { bg: "#dc2626" });',
        ],
        () => {
          ui.row({ gap: 8, align: "center" }, () => {
            ui.button("Auto", { id: "bg-auto", radius: 5 });
            ui.button("Accent", {
              id: "bg-accent",
              bg: "accent",
              textColor: "#052e16",
              radius: 5,
            });
            ui.button("Custom", {
              id: "bg-red",
              bg: "#dc2626",
              textColor: "#fff",
              radius: 5,
            });
          });
        },
      );

      section(
        "Radius & border",
        "Rounded corners and a 1px border work on any node.",
        [
          "ui.node({",
          "  width: 56, height: 56,",
          '  bg: "#1e3a8a",',
          "  radius: 12,",
          '  border: "rgba(255,255,255,0.3)",',
          "});",
        ],
        () => {
          ui.row({ gap: 10, align: "center", justify: "center" }, () => {
            for (const r of [0, 4, 12, 28] as const) {
              ui.col({ gap: 4, align: "center" }, () => {
                ui.node({
                  width: 56,
                  height: 56,
                  bg: "#1e3a8a",
                  border: "rgba(255,255,255,0.3)",
                  radius: r,
                });
                ui.withTextColor(MUTED, () => {
                  ui.withFont("10px ui-monospace, monospace", () => {
                    ui.label(`r:${r}`);
                  });
                });
              });
            }
          });
        },
      );

      section(
        "Spacers",
        "A featureless node. Combine with width: grow to push siblings apart.",
        [
          'ui.row({ width: "grow", align: "center" }, () => {',
          '  ui.label("Title");',
          '  ui.spacer({ width: "grow" });',
          '  ui.button("Close");',
          "});",
        ],
        () => {
          ui.row(
            {
              width: "grow",
              padding: 8,
              bg: "#030712",
              radius: 4,
              align: "center",
            },
            () => {
              ui.label("Title");
              ui.spacer({ width: "grow" });
              ui.button("Close", { id: "doc-close", radius: 5 });
            },
          );
        },
      );

      section(
        "Cursor",
        'Hovering a clickable widget changes the cursor to "pointer". Sliders show "ew-resize". Override via the cursor opt with any CSS cursor name.',
        [
          'ui.button("Pointer");           // default for clickable',
          'ui.button("Help",   { cursor: "help" });',
          'ui.button("Move",   { cursor: "move" });',
          'ui.button("Crosshair", { cursor: "crosshair" });',
        ],
        () => {
          ui.row({ gap: 8, align: "center" }, () => {
            ui.button("Pointer", { id: "cur-pointer", radius: 5 });
            ui.button("Help", { id: "cur-help", radius: 5, cursor: "help" });
            ui.button("Move", { id: "cur-move", radius: 5, cursor: "move" });
            ui.button("Crosshair", {
              id: "cur-cross",
              radius: 5,
              cursor: "crosshair",
            });
          });
        },
      );

      section(
        "Text wrapping",
        "Add wrap: true to a label. The label wraps at word boundaries to fit its assigned width. Try resizing the browser to see this paragraph reflow.",
        [
          "ui.label(longText, {",
          "  wrap: true,",
          '  width: "grow",',
          "});",
        ],
        () => {
          ui.col({ width: "grow", gap: 6 }, () => {
            ui.label(
              "This is a longer label that will wrap onto multiple lines when there isn't enough horizontal space to render it on one line. Word boundaries are preserved.",
              { wrap: true, width: "grow" },
            );
            ui.withTextColor(MUTED, () => {
              ui.withFont("12px ui-monospace, monospace", () => {
                ui.label(
                  "Wrap height is computed during layout, so siblings stack correctly.",
                  { wrap: true, width: "grow" },
                );
              });
            });
          });
        },
      );

      // ── Widgets ──────────────────────────────────────────────────
      tag("Widgets");
      section(
        "Buttons",
        "button() returns a Comm. The .clicked field is true once on the frame after release.",
        [
          'if (ui.button("Click me").clicked) {',
          "  state.clicks++;",
          "}",
        ],
        () => {
          ui.row({ gap: 12, align: "center" }, () => {
            if (
              ui.button("Click me", { id: "doc-click", radius: 5 }).clicked
            ) {
              ui.cmd("docs.click");
            }
            ui.withTextColor(MUTED, () => {
              ui.withFont("13px ui-monospace, monospace", () => {
                ui.label(`clicks: ${state.clicks}`);
              });
            });
            if (
              ui.button("Reset", { id: "doc-reset", radius: 5 }).clicked
            ) {
              ui.cmd("docs.reset-count");
            }
          });
        },
      );

      section(
        "Toggles",
        "toggle(label, value) returns { ...Comm, value } — pass the value back to your state.",
        [
          "state.liked = ui.toggle(",
          '  state.liked ? "♥ Liked" : "♡ Like",',
          "  state.liked,",
          ").value;",
        ],
        () => {
          ui.row({ gap: 12, align: "center" }, () => {
            const t = ui.toggle(
              state.liked ? "♥ Liked" : "♡ Like",
              state.liked,
              { id: "doc-liked", radius: 5, width: 100 },
            );
            if (t.clicked) ui.cmd("docs.toggle-liked");
            ui.withTextColor(MUTED, () => {
              ui.withFont("13px ui-monospace, monospace", () => {
                ui.label(`liked = ${state.liked}`);
              });
            });
          });
        },
      );

      section(
        "Sliders",
        "slider(label, v, min, max) returns { ...Comm, value }. The value updates live while dragging.",
        [
          "state.volume = ui.slider(",
          '  "Volume", state.volume, 0, 1,',
          ").value;",
        ],
        () => {
          state.volume = ui.slider("Volume", state.volume, 0, 1, {
            id: "doc-vol",
            radius: 5,
          }).value;
          ui.withTextColor(MUTED, () => {
            ui.withFont("12px ui-monospace, monospace", () => {
              ui.label(`value = ${state.volume.toFixed(3)}`);
            });
          });
        },
      );

      // ── Style stacks ──────────────────────────────────────────────
      tag("Style stacks");
      section(
        "withFont / withTextColor",
        "Share styling across a block instead of repeating opts on every widget.",
        [
          'ui.withFont("bold 16px monospace", () => {',
          '  ui.label("Title");',
          "});",
          'ui.withTextColor("#fca5a5", () => {',
          '  ui.button("Delete");',
          '  ui.button("Drop");',
          "});",
        ],
        () => {
          ui.withFont("bold 16px ui-monospace, monospace", () => {
            ui.label("title");
          });
          ui.withTextColor("#fca5a5", () => {
            ui.row({ gap: 6 }, () => {
              ui.button("Delete", { id: "ss-del", radius: 5 });
              ui.button("Drop", { id: "ss-drop", radius: 5 });
            });
          });
        },
      );

      section(
        "withWidth / withHeight",
        "Useful for giving a row of widgets the same size without repeating opts.",
        [
          "ui.withHeight(40, () => {",
          '  ui.button("A");',
          '  ui.button("B");',
          '  ui.button("C");',
          "});",
        ],
        () => {
          ui.row({ gap: 6 }, () => {
            ui.withHeight(40, () => {
              ui.button("A", { id: "wh-a", radius: 5, width: 50 });
              ui.button("B", { id: "wh-b", radius: 5, width: 50 });
              ui.button("C", { id: "wh-c", radius: 5, width: 50 });
            });
          });
        },
      );

      // ── Advanced ──────────────────────────────────────────────────
      tag("Advanced");
      section(
        "Scrollable containers",
        "scrollable: true + a fixed height makes a container clip and wheel-scroll its overflow.",
        [
          "ui.col({",
          "  scrollable: true,",
          "  height: 140,",
          "}, () => {",
          "  for (const item of items) {",
          "    ui.button(item.name);",
          "  }",
          "});",
        ],
        () => {
          ui.col(
            {
              id: "doc-inner-scroll",
              width: "grow",
              height: 140,
              padding: 6,
              gap: 4,
              bg: "#030712",
              border: CARD_BORDER,
              radius: 6,
              scrollable: true,
              align: "stretch",
            },
            () => {
              for (let i = 0; i < 18; i++) {
                ui.button(`Item ${i + 1}`, {
                  id: `doc-item-${i}`,
                  radius: 4,
                  height: 28,
                });
              }
            },
          );
        },
      );

      section(
        "Absolute positioning",
        "Passing x and y pulls a node out of layout flow. Useful for FABs, tooltips, popovers.",
        [
          'ui.button("+", {',
          "  x: w - 60, y: h - 60,",
          "  width: 44, height: 44, radius: 22,",
          '  bg: "accent",',
          "});",
        ],
        () => {
          ui.col(
            {
              width: "grow",
              padding: 8,
              bg: "#030712",
              radius: 4,
              gap: 4,
            },
            () => {
              ui.withTextColor(MUTED, () => {
                ui.withFont("12px system-ui, sans-serif", () => {
                  ui.label("→ see the floating + button");
                  ui.label("   in the bottom-right of the canvas");
                });
              });
            },
          );
        },
      );

      section(
        "Text input",
        "ui.textInput(value, opts) returns the updated value. Click to focus, type, use arrows / Home / End / Backspace / Delete. Enter or Escape blurs.",
        [
          "state.name = ui.textInput(state.name, {",
          '  id: "name",',
          '  placeholder: "Your name",',
          '  width: "grow",',
          "}).value;",
        ],
        () => {
          state.name = ui.textInput(state.name, {
            id: "doc-name",
            placeholder: "Your name",
            width: "grow",
          }).value;
          state.email = ui.textInput(state.email, {
            id: "doc-email",
            placeholder: "you@example.com",
            width: "grow",
          }).value;
          ui.withTextColor(MUTED, () => {
            ui.withFont("12px ui-monospace, monospace", () => {
              ui.label(`name = ${JSON.stringify(state.name)}`);
              ui.label(`email = ${JSON.stringify(state.email)}`);
            });
          });
        },
      );

      section(
        "Modals",
        "ui.modal() draws a backdrop covering the canvas and centers its content. Clicks on the backdrop don't fall through; check the returned Comm.clicked to dismiss on backdrop click.",
        [
          "if (state.showModal) {",
          '  const m = ui.modal({ id: "confirm" }, () => {',
          '    ui.col({ width: 320, bg: CARD_BG, radius: 12, padding: 20 },',
          "      () => { /* dialog content */ });",
          "  });",
          '  if (m.clicked) state.showModal = false;  // backdrop click',
          "}",
        ],
        () => {
          if (
            ui.button("Open modal", {
              id: "doc-open-modal",
              radius: 5,
            }).clicked
          ) {
            ui.cmd("docs.open-modal");
          }
        },
      );

      section(
        "Command buffer",
        "Queue mutations during build; the handler runs at the start of the next frame, before any builder code. Hotkeys and clicks can emit the same command.",
        [
          "ui.onCommand((name) => {",
          '  if (name === "count.reset") {',
          "    state.clicks = 0;",
          "  }",
          "});",
          "",
          '// during build:',
          'if (ui.button("Reset").clicked) {',
          '  ui.cmd("count.reset");',
          "}",
        ],
        () => {
          ui.row({ gap: 12, align: "center" }, () => {
            if (
              ui.button("+1", { id: "doc-cmd-inc", radius: 5 }).clicked
            ) {
              ui.cmd("docs.click");
            }
            if (
              ui.button("Reset", { id: "doc-cmd-reset", radius: 5 }).clicked
            ) {
              ui.cmd("docs.reset-count");
            }
            ui.withTextColor(MUTED, () => {
              ui.withFont("13px ui-monospace, monospace", () => {
                ui.label(`count: ${state.clicks}`);
              });
            });
          });
        },
      );

      // ── Footer ────────────────────────────────────────────────────
      ui.col(
        {
          width: "grow",
          padding: 18,
          gap: 4,
          bg: CHROME_BG,
          border: CARD_BORDER,
          radius: CARD_RADIUS,
          align: "center",
        },
        () => {
          ui.withTextColor(MUTED, () => {
            ui.withFont("12px system-ui, sans-serif", () => {
              ui.label("That's the whole API.");
            });
          });
        },
      );

      ui.spacer({ height: 12 });
    },
  );

  // floating + (referenced in the Absolute positioning section)
  ui.button("+", {
    id: "doc-fab",
    x: w - 60,
    y: h - 60,
    width: 44,
    height: 44,
    radius: 22,
    bg: "accent",
    textColor: "#052e16",
    font: "bold 22px system-ui, sans-serif",
  });

  // modal overlay (referenced in the Modals section)
  if (state.modalOpen) {
    const m = ui.modal({ id: "doc-confirm" }, () => {
      ui.col(
        {
          width: 360,
          padding: 22,
          gap: 14,
          bg: CARD_BG,
          border: CARD_BORDER,
          radius: 12,
          align: "stretch",
        },
        () => {
          ui.withFont("bold 18px system-ui, sans-serif", () => {
            ui.label("Are you sure?");
          });
          ui.label(
            "This is a modal. Click outside it to dismiss, or use the buttons.",
            { wrap: true, width: "grow" },
          );
          ui.row({ width: "grow", gap: 8 }, () => {
            if (
              ui.button("Cancel", {
                id: "doc-modal-cancel",
                width: "grow",
                height: 36,
                radius: 5,
              }).clicked
            ) {
              ui.cmd("docs.close-modal");
            }
            ui.withTextColor("#fff", () => {
              if (
                ui.button("Confirm", {
                  id: "doc-modal-confirm",
                  width: "grow",
                  height: 36,
                  radius: 5,
                  bg: "#16a34a",
                }).clicked
              ) {
                ui.cmd("docs.close-modal");
              }
            });
          });
        },
      );
    });
    if (m.clicked) ui.cmd("docs.close-modal");
  }
}
