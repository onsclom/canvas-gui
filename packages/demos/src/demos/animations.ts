import * as ui from "canvas-gui";

const CARD_BG = "#1f2937";
const CHROME_BG = "#0b0f17";
const CARD_BORDER = "rgba(255,255,255,0.06)";
const MUTED = "#9ca3af";

const state = {
  targetCount: 0,
  springCount: 0,
  decay: 14,
  bars: [0.3, 0.5, 0.7, 0.4, 0.6, 0.8],
  barsCurrent: [0.3, 0.5, 0.7, 0.4, 0.6, 0.8],
  followerX: 200,
  followerY: 200,
  followerTargetX: 200,
  followerTargetY: 200,
  hue: 200,
  hueTarget: 200,
};

ui.onCommand((name, args) => {
  switch (name) {
    case "anim.bump":
      state.targetCount += args!["d"] as number;
      break;
    case "anim.set-hue":
      state.hueTarget = args!["h"] as number;
      break;
  }
});

export function tick(ctx: CanvasRenderingContext2D, _dt: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;

  ctx.fillStyle = "#030712";
  ctx.fillRect(0, 0, w, h);

  // advance all the per-tick animations
  state.springCount = ui.smooth(state.springCount, state.targetCount, state.decay);
  for (let i = 0; i < state.bars.length; i++) {
    state.barsCurrent[i] = ui.smooth(
      state.barsCurrent[i]!,
      state.bars[i]!,
      18,
    );
  }
  state.followerX = ui.smooth(state.followerX, state.followerTargetX, 8);
  state.followerY = ui.smooth(state.followerY, state.followerTargetY, 8);
  // hue lives on a circle: unwrap so we always blend the short way around the
  // wheel (e.g. 350° → 10° goes through 0°, not all the way back through 180°)
  const hueDiff = state.hueTarget - state.hue;
  if (hueDiff > 180) state.hue += 360;
  else if (hueDiff < -180) state.hue -= 360;
  state.hue = ui.smooth(state.hue, state.hueTarget, 6);

  ui.col(
    {
      id: "anim-scroll",
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
      ui.col({ width: "grow", align: "center" }, () => {
        ui.withFont("bold 24px system-ui, sans-serif", () => {
          ui.label("Custom animations");
        });
        ui.withTextColor(MUTED, () => {
          ui.withFont("13px system-ui, sans-serif", () => {
            ui.label(
              "Framerate-independent smoothing via ui.smooth(current, target, decay).",
            );
          });
        });
      });

      // ── spring number ──
      card("Spring number", () => {
        ui.row({ width: "grow", gap: 16, align: "center" }, () => {
          ui.col({ width: 220, align: "center", gap: 4 }, () => {
            ui.withTextColor(MUTED, () => {
              ui.withFont("10px system-ui, sans-serif", () => {
                ui.label("TARGET");
              });
            });
            ui.withFont("bold 22px ui-monospace, monospace", () => {
              ui.label(state.targetCount.toString());
            });
            ui.withTextColor(MUTED, () => {
              ui.withFont("10px system-ui, sans-serif", () => {
                ui.label("CURRENT");
              });
            });
            ui.withTextColor("#4ade80", () => {
              ui.withFont("bold 44px ui-monospace, monospace", () => {
                ui.label(state.springCount.toFixed(2));
              });
            });
          });
          ui.col({ width: "grow", gap: 8 }, () => {
            ui.row({ width: "grow", gap: 6 }, () => {
              for (const d of [-10, -1, 1, 10]) {
                const label = d > 0 ? `+${d}` : `${d}`;
                if (
                  ui.button(label, {
                    id: `bump-${d}`,
                    width: "grow",
                    height: 36,
                    radius: 5,
                    font: "bold 14px system-ui, sans-serif",
                  }).clicked
                ) {
                  ui.cmd("anim.bump", { d });
                }
              }
            });
            ui.withTextColor(MUTED, () => {
              ui.withFont("11px system-ui, sans-serif", () => {
                ui.label("Decay rate (higher = snappier)");
              });
            });
            state.decay = ui.slider("decay", state.decay, 1, 40, {
              id: "decay",
              width: "grow",
              height: 28,
              radius: 5,
              precision: 0,
              step: 1,
            }).value;
          });
        });
      });

      // ── animated bars ──
      card("Animated bars", () => {
        ui.withTextColor(MUTED, () => {
          ui.withFont("11px system-ui, sans-serif", () => {
            ui.label(
              "Each slider drives a target height; the bar smooths toward it.",
            );
          });
        });
        ui.row(
          {
            width: "grow",
            gap: 12,
            align: "end",
            height: 140,
          },
          () => {
            for (let i = 0; i < state.bars.length; i++) {
              ui.node({
                width: "grow",
                height: Math.max(2, state.barsCurrent[i]! * 140),
                bg: `hsl(${(i * 50 + 180) % 360},70%,55%)`,
                radius: 4,
              });
            }
          },
        );
        ui.row({ width: "grow", gap: 12 }, () => {
          for (let i = 0; i < state.bars.length; i++) {
            ui.col({ width: "grow", gap: 4 }, () => {
              state.bars[i] = ui.slider(
                "",
                state.bars[i]!,
                0,
                1,
                {
                  id: `bar-${i}`,
                  width: "grow",
                  height: 22,
                  radius: 4,
                  precision: 2,
                },
              ).value;
            });
          }
        });
      });

      // ── follow-the-cursor ──
      card("Follower", () => {
        ui.withTextColor(MUTED, () => {
          ui.withFont("11px system-ui, sans-serif", () => {
            ui.label(
              "Click anywhere on the box to set a target; the dot eases toward it.",
            );
          });
        });
        const c = ui.node({
          id: "follow-pad",
          width: "grow",
          height: 160,
          bg: CHROME_BG,
          border: CARD_BORDER,
          radius: 6,
          clickable: true,
          cursor: "crosshair",
        });
        if (c.clicked) {
          // map click position back to inside the pad
          state.followerTargetX = c.rect.x + (ui.mouseX() - c.rect.x);
          state.followerTargetY = c.rect.y + (ui.mouseY() - c.rect.y);
        }
        // draw the chase dot + target marker absolutely (outside layout)
        ui.node({
          x: state.followerTargetX - 4,
          y: state.followerTargetY - 4,
          width: 8,
          height: 8,
          radius: 4,
          bg: "rgba(248,113,113,0.6)",
        });
        ui.node({
          x: state.followerX - 9,
          y: state.followerY - 9,
          width: 18,
          height: 18,
          radius: 9,
          bg: "#4ade80",
        });
      });

      // ── color blend ──
      card("Color blend", () => {
        ui.withTextColor(MUTED, () => {
          ui.withFont("11px system-ui, sans-serif", () => {
            ui.label("Hue smoothes between picker buttons.");
          });
        });
        ui.row({ width: "grow", gap: 6 }, () => {
          for (const h of [0, 30, 60, 120, 180, 240, 280, 320]) {
            const isSelected = Math.abs(state.hueTarget - h) < 1;
            if (
              ui.button("", {
                id: `hue-${h}`,
                width: "grow",
                height: 32,
                radius: 6,
                bg: `hsl(${h},70%,55%)`,
                border: isSelected ? "#fff" : undefined,
              }).clicked
            ) {
              ui.cmd("anim.set-hue", { h });
            }
          }
        });
        const shownHue = ((state.hue % 360) + 360) % 360;
        ui.node({
          width: "grow",
          height: 80,
          bg: `hsl(${shownHue.toFixed(1)},70%,55%)`,
          radius: 8,
          text: `hue ${shownHue.toFixed(1)}°`,
          textColor: "#fff",
          textAlign: "center",
          font: "bold 18px system-ui, sans-serif",
        });
      });

      ui.spacer({ height: 12 });
    },
  );
}

function card(title: string, fn: () => void) {
  ui.col(
    {
      width: "grow",
      padding: 18,
      gap: 10,
      bg: CARD_BG,
      border: CARD_BORDER,
      radius: 8,
      align: "stretch",
    },
    () => {
      ui.withFont("bold 14px system-ui, sans-serif", () => {
        ui.label(title);
      });
      fn();
    },
  );
}
