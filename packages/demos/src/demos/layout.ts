import * as ui from "canvas-gui";

type Section = "Home" | "Profile" | "Settings" | "About";
const sections: Section[] = ["Home", "Profile", "Settings", "About"];

const state = {
  section: "Home" as Section,
  volume: 0.7,
  brightness: 0.5,
  detail: 0.5,
  dark: true,
  notifications: false,
  pad: 12,
};

const TOP_OFFSET = 50;
const CARD_RADIUS = 8;
const BUTTON_RADIUS = 5;
const CARD_BORDER = "rgba(255,255,255,0.06)";

ui.onCommand((name, args) => {
  switch (name) {
    case "layout.section":
      state.section = args!["section"] as Section;
      break;
    case "layout.toggle-dark":
      state.dark = !state.dark;
      break;
    case "layout.toggle-notifications":
      state.notifications = !state.notifications;
      break;
    case "layout.reset":
      state.volume = 0.7;
      state.brightness = 0.5;
      state.detail = 0.5;
      state.dark = true;
      state.notifications = false;
      break;
    case "layout.cycle-section": {
      const i = sections.indexOf(state.section);
      state.section = sections[(i + 1) % sections.length]!;
      break;
    }
  }
});

export function tick(ctx: CanvasRenderingContext2D, dt: number) {
  const w = ctx.canvas.width / devicePixelRatio;
  const h = ctx.canvas.height / devicePixelRatio;

  ctx.fillStyle = "#030712";
  ctx.fillRect(0, 0, w, h);

  const pad = Math.round(state.pad);
  const halfPad = Math.max(2, Math.round(pad / 2));

  ui.col(
    {
      x: 0,
      y: TOP_OFFSET,
      width: "grow",
      height: "grow",
      padding: pad,
      gap: pad,
    },
    () => {
      // top bar
      ui.row(
        {
          width: "grow",
          padding: pad,
          gap: pad,
          bg: "#0b0f17",
          border: CARD_BORDER,
          radius: CARD_RADIUS,
          align: "center",
        },
        () => {
          ui.withFont("bold 16px system-ui, sans-serif", () => {
            ui.label("Dashboard");
          });
          ui.spacer({ width: "grow" });
          state.pad = ui.slider("Density", state.pad, 4, 32, {
            width: 180,
            radius: BUTTON_RADIUS,
          }).value;
          ui.button("New", { radius: BUTTON_RADIUS });
        },
      );

      ui.row({ width: "grow", height: "grow", gap: pad }, () => {
        // sidebar
        ui.col(
          {
            width: 200,
            height: "grow",
            padding: pad,
            gap: halfPad,
            bg: "#0b0f17",
            border: CARD_BORDER,
            radius: CARD_RADIUS,
            align: "stretch",
          },
          () => {
            ui.withTextColor("#9ca3af", () => {
              ui.withFont("bold 11px system-ui, sans-serif", () => {
                ui.label("SECTIONS");
              });
            });
            ui.spacer({ height: 4 });
            ui.withHeight(32, () => {
              for (const sec of sections) {
                const isActive = state.section === sec;
                if (isActive) {
                  ui.toggle(sec, true, {
                    id: `nav-${sec}`,
                    radius: BUTTON_RADIUS,
                  });
                } else {
                  if (
                    ui.button(sec, {
                      id: `nav-${sec}`,
                      radius: BUTTON_RADIUS,
                    }).clicked
                  ) {
                    ui.cmd("layout.section", { section: sec });
                  }
                }
              }
            });
          },
        );

        ui.col({ width: "grow", height: "grow", gap: pad }, () => {
          // toolbar
          ui.row(
            {
              width: "grow",
              padding: pad,
              bg: "#0b0f17",
              border: CARD_BORDER,
              radius: CARD_RADIUS,
              align: "center",
            },
            () => {
              ui.withFont("bold 14px system-ui, sans-serif", () => {
                ui.label(state.section);
              });
              ui.spacer({ width: "grow" });
              ui.button("Save", { radius: BUTTON_RADIUS });
              ui.button("Cancel", { radius: BUTTON_RADIUS });
            },
          );

          ui.row({ width: "grow", height: "grow", gap: pad }, () => {
            // settings card
            ui.col(
              {
                width: "grow",
                height: "grow",
                padding: pad,
                gap: halfPad,
                bg: "#1f2937",
                border: CARD_BORDER,
                radius: CARD_RADIUS,
                align: "stretch",
              },
              () => {
                ui.withFont("bold 13px system-ui, sans-serif", () => {
                  ui.label(`${state.section} settings`);
                });
                ui.spacer({ height: 2 });

                state.volume = ui.slider("Volume", state.volume, 0, 1, {
                  radius: BUTTON_RADIUS,
                }).value;
                state.brightness = ui.slider(
                  "Brightness",
                  state.brightness,
                  0,
                  1,
                  { radius: BUTTON_RADIUS },
                ).value;
                state.detail = ui.slider("Detail", state.detail, 0, 1, {
                  radius: BUTTON_RADIUS,
                }).value;

                ui.row(
                  { width: "grow", align: "center" },
                  () => {
                    ui.label("Dark mode");
                    ui.spacer({ width: "grow" });
                    if (
                      ui.toggle(
                        state.dark ? "On" : "Off",
                        state.dark,
                        { id: "dark", width: 70, radius: BUTTON_RADIUS },
                      ).clicked
                    ) {
                      ui.cmd("layout.toggle-dark");
                    }
                  },
                );

                ui.row(
                  { width: "grow", align: "center" },
                  () => {
                    ui.label("Notifications");
                    ui.spacer({ width: "grow" });
                    if (
                      ui.toggle(
                        state.notifications ? "On" : "Off",
                        state.notifications,
                        {
                          id: "notif",
                          width: 70,
                          radius: BUTTON_RADIUS,
                        },
                      ).clicked
                    ) {
                      ui.cmd("layout.toggle-notifications");
                    }
                  },
                );

                ui.spacer({ height: 4 });
                ui.row({ width: "grow", gap: halfPad }, () => {
                  ui.button("Apply", {
                    width: "grow",
                    height: 32,
                    radius: BUTTON_RADIUS,
                  });
                  ui.button("Discard", {
                    width: "grow",
                    height: 32,
                    radius: BUTTON_RADIUS,
                  });
                  ui.withTextColor("#fca5a5", () => {
                    if (
                      ui.button("Reset", {
                        width: "grow",
                        height: 32,
                        radius: BUTTON_RADIUS,
                      }).clicked
                    ) {
                      ui.cmd("layout.reset");
                    }
                  });
                });
              },
            );

            // stats card
            ui.col(
              {
                width: 240,
                height: "grow",
                padding: pad,
                gap: halfPad,
                bg: "#1f2937",
                border: CARD_BORDER,
                radius: CARD_RADIUS,
                align: "stretch",
              },
              () => {
                ui.withFont("bold 13px system-ui, sans-serif", () => {
                  ui.label("Live stats");
                });
                ui.spacer({ height: 2 });
                ui.withTextColor("#9ca3af", () => {
                  ui.label(`fps  ${(1000 / dt).toFixed(0)}`);
                  ui.label(`section  ${state.section}`);
                  ui.label(`density  ${pad}`);
                  ui.label(`canvas  ${Math.round(w)}×${Math.round(h)}`);
                  ui.label(`volume  ${state.volume.toFixed(2)}`);
                  ui.label(`brightness  ${state.brightness.toFixed(2)}`);
                  ui.label(`detail  ${state.detail.toFixed(2)}`);
                });
              },
            );
          });
        });
      });
    },
  );

  // FAB
  if (
    ui.button("+", {
      id: "fab",
      x: w - 60,
      y: h - 60,
      width: 44,
      height: 44,
      radius: 22,
      bg: "accent",
      textColor: "#052e16",
      font: "bold 22px system-ui, sans-serif",
    }).clicked
  ) {
    ui.cmd("layout.cycle-section");
  }
}
