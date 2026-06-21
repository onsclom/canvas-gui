import * as ui from "canvas-gui";

// the landing page is built with the library it's pitching. every pixel
// you see is a canvas-gui widget, no DOM elements besides the canvas.

const ACCENT = "#4ade80";
const TEXT = "#f3f4f6";
const MUTED = "#9ca3af";
const CARD_BG = "#0f172a";
const CARD_BORDER = "rgba(255,255,255,0.06)";
const CODE_BG = "#020617";
const CODE_FG = "#cbd5e1";

const state = {
  count: 0,
  liked: false,
};

export function tick(ctx: CanvasRenderingContext2D, _dt: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;

  ctx.fillStyle = "#030712";
  ctx.fillRect(0, 0, w, h);

  ui.col(
    {
      id: "lp-scroll",
      x: 0,
      y: 0,
      width: "grow",
      height: "grow",
      padding: 32,
      gap: 28,
      align: "center",
      scrollable: true,
    },
    () => {
      // centered 800px column on wide screens; shrinks on narrow
      const colW: ui.SizeSpec = w < 880 ? "grow" : 800;
      ui.col({ width: colW, gap: 28, align: "stretch" }, () => {
        hero();
        why();
        codeSample();
        miniDemo();
        footer();
      });
    },
  );
}

// ─── hero ──────────────────────────────────────────────────────
function hero() {
  ui.col(
    {
      width: "grow",
      padding: 36,
      gap: 14,
      align: "center",
    },
    () => {
      ui.withFont(
        "bold 72px system-ui, sans-serif",
        () => ui.withTextColor(TEXT, () => ui.label("canvas-gui")),
      );
      ui.withFont(
        "18px system-ui, sans-serif",
        () => ui.withTextColor(MUTED, () => {
          ui.label(
            "Immediate-mode UI for HTML canvas. No DOM, no retained tree, no CSS — just describe the UI every frame.",
            { wrap: true, width: "grow", textAlign: "center" },
          );
        }),
      );
      ui.spacer({ height: 8 });
      ui.row({ gap: 10, align: "center" }, () => {
        ui.button("Read the docs", {
          id: "lp-docs",
          width: 160,
          height: 40,
          radius: 6,
          bg: "accent",
          textColor: "#052e16",
          font: "bold 14px system-ui, sans-serif",
        });
        ui.button("View on GitHub", {
          id: "lp-gh",
          width: 160,
          height: 40,
          radius: 6,
          bg: "transparent",
          border: "rgba(255,255,255,0.18)",
          textColor: TEXT,
          font: "bold 14px system-ui, sans-serif",
        });
      });
    },
  );
}

// ─── why ──────────────────────────────────────────────────────
function why() {
  ui.col({ width: "grow", gap: 12, align: "stretch" }, () => {
    sectionHeader("Why it exists");
    ui.row({ width: "grow", gap: 12, align: "stretch" }, () => {
      whyCard(
        "No HTML / CSS",
        "Layout is flexbox-style props on TypeScript objects. row, col, width: \"grow\", padding, gap, justify, align. No selectors, no specificity wars.",
      );
      whyCard(
        "No retained tree",
        "Every frame rebuilds the UI from scratch. Conditional widgets are a regular `if`. No reconciliation, no virtual DOM, no stale event listeners.",
      );
    });
    ui.row({ width: "grow", gap: 12, align: "stretch" }, () => {
      whyCard(
        "Tiny footprint",
        "The library is a handful of source files with zero runtime dependencies. Reads top-to-bottom. No build pipeline to learn.",
      );
      whyCard(
        "Vendor + edit",
        "Designed to be copied into your project. Want a new widget or a custom palette? Open the file and add it. The internals are friendly.",
      );
    });
  });
}

function whyCard(title: string, body: string) {
  ui.col(
    {
      width: "grow",
      padding: 20,
      gap: 8,
      bg: CARD_BG,
      border: CARD_BORDER,
      radius: 10,
      align: "stretch",
    },
    () => {
      ui.withFont(
        "bold 16px system-ui, sans-serif",
        () => ui.withTextColor(TEXT, () => ui.label(title)),
      );
      ui.withFont(
        "13px system-ui, sans-serif",
        () => ui.withTextColor(MUTED, () => {
          ui.label(body, { wrap: true, width: "grow" });
        }),
      );
    },
  );
}

// ─── code sample ──────────────────────────────────────────────
function codeSample() {
  ui.col({ width: "grow", gap: 12, align: "stretch" }, () => {
    sectionHeader("Look like this");
    codeBlock([
      'import * as ui from "canvas-gui";',
      "",
      "let count = 0;",
      "",
      "export function tick(ctx, dt) {",
      "  ui.col({ x: 20, y: 20, gap: 8 }, () => {",
      '    ui.label("clicks: " + count);',
      "    ui.row({ gap: 6 }, () => {",
      '      if (ui.button("−").clicked) count--;',
      '      if (ui.button("+").clicked) count++;',
      "    });",
      "  });",
      "}",
    ]);
  });
}

function codeBlock(lines: string[]) {
  ui.col(
    {
      width: "grow",
      padding: 18,
      gap: 2,
      bg: CODE_BG,
      border: CARD_BORDER,
      radius: 8,
      align: "stretch",
    },
    () => {
      ui.withFont(
        "13px ui-monospace, Menlo, Consolas, monospace",
        () => ui.withTextColor(CODE_FG, () => {
          for (const line of lines) ui.label(line || " ");
        }),
      );
    },
  );
}

// ─── mini interactive demo ────────────────────────────────────
function miniDemo() {
  ui.col({ width: "grow", gap: 12, align: "stretch" }, () => {
    sectionHeader("And it runs right here");
    ui.col(
      {
        width: "grow",
        padding: 24,
        gap: 16,
        bg: CARD_BG,
        border: CARD_BORDER,
        radius: 10,
        align: "stretch",
      },
      () => {
        ui.withTextColor(MUTED, () => {
          ui.withFont("12px system-ui, sans-serif", () => {
            ui.label(
              "This card and everything around it is one canvas. The buttons below are canvas-gui widgets, drawn 60 times a second.",
              { wrap: true, width: "grow" },
            );
          });
        });
        ui.row({ width: "grow", gap: 14, align: "center" }, () => {
          ui.col({ width: 140, align: "center", gap: 2 }, () => {
            ui.withTextColor(MUTED, () => {
              ui.withFont(
                "10px system-ui, sans-serif",
                () => ui.label("COUNT"),
              );
            });
            ui.withTextColor(ACCENT, () => {
              ui.withFont(
                "bold 40px ui-monospace, monospace",
                () => ui.label(state.count.toString()),
              );
            });
          });
          ui.col({ width: "grow", gap: 8 }, () => {
            ui.row({ width: "grow", gap: 8 }, () => {
              for (const d of [-10, -1, 1, 10]) {
                const label = d > 0 ? `+${d}` : `${d}`;
                if (
                  ui.button(label, {
                    id: `lp-bump-${d}`,
                    width: "grow",
                    height: 36,
                    radius: 5,
                    font: "bold 14px system-ui, sans-serif",
                  }).clicked
                ) {
                  state.count += d;
                }
              }
            });
            const t = ui.toggle(
              state.liked ? "♥  Liked" : "♡  Like this library",
              state.liked,
              {
                id: "lp-like",
                width: "grow",
                height: 36,
                radius: 5,
                font: "bold 14px system-ui, sans-serif",
              },
            );
            if (t.clicked) state.liked = !state.liked;
          });
        });
      },
    );
  });
}

// ─── footer ───────────────────────────────────────────────────
function footer() {
  ui.col(
    { width: "grow", padding: 24, gap: 6, align: "center" },
    () => {
      ui.withTextColor(MUTED, () => {
        ui.withFont("12px system-ui, sans-serif", () => {
          ui.label("Built with itself. MIT licensed. Designed to be edited.");
        });
      });
    },
  );
  ui.spacer({ height: 16 });
}

function sectionHeader(text: string) {
  ui.withTextColor(MUTED, () => {
    ui.withFont(
      "bold 11px system-ui, sans-serif",
      () => ui.label(text.toUpperCase()),
    );
  });
}
